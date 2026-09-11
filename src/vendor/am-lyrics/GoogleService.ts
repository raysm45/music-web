const CONFIG = {
  GOOGLE: {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    FETCH_TIMEOUT_MS: 6000,
  },
};

interface RomanizableLine {
  text?: { text: string; romanizedText?: string }[] | string;
  romanizedText?: string;
  isWordSynced?: boolean;
}

export class GoogleService {
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  private static fetchWithTimeout(
    url: string,
    timeoutMs = CONFIG.GOOGLE.FETCH_TIMEOUT_MS,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() =>
      clearTimeout(timeoutId),
    );
  }

  private static isPurelyLatinScript(text: string): boolean {
    return /^[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F]*$/.test(
      text,
    );
  }

  static async translate(
    textOrArray: string | string[],
    targetLang: string,
  ): Promise<string | string[]> {
    if (
      !textOrArray ||
      (Array.isArray(textOrArray) && textOrArray.length === 0)
    ) {
      return Array.isArray(textOrArray) ? [] : '';
    }

    const isArray = Array.isArray(textOrArray);
    const texts = isArray ? (textOrArray as string[]) : [textOrArray as string];

    const nonEmptyIndices: number[] = [];
    const textsToTranslate: string[] = [];

    texts.forEach((t, i) => {
      if (t && t.trim()) {
        nonEmptyIndices.push(i);
        textsToTranslate.push(t);
      }
    });

    if (textsToTranslate.length === 0) {
      return isArray ? texts : texts[0];
    }

    const BATCH_SIZE_CHARS = 1500;
    const translatedResults: string[] = new Array(textsToTranslate.length).fill(
      '',
    );

    let currentBatch: string[] = [];
    let currentBatchIndices: number[] = [];
    let currentBatchLength = 0;

    const processBatch = async (batch: string[], indices: number[]) => {
      if (batch.length === 0) return;
      const joinedText = batch.join('\n');

      let attempt = 0;
      let success = false;

      while (attempt < CONFIG.GOOGLE.MAX_RETRIES && !success) {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(joinedText)}`;
          const response = await GoogleService.fetchWithTimeout(url);
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();


          const fullTranslation =
            data?.[0]?.map((seg: any) => seg?.[0]).join('') || '';

          const lines = fullTranslation.split('\n');




          indices.forEach((originalIdx, i) => {
            if (i < lines.length) {
              translatedResults[originalIdx] = lines[i];
            } else {
              translatedResults[originalIdx] = batch[i];
            }
          });

          success = true;
        } catch (e) {
          attempt += 1;
          if (attempt < CONFIG.GOOGLE.MAX_RETRIES) {
            await GoogleService.delay(
              CONFIG.GOOGLE.RETRY_DELAY_MS * 2 ** (attempt - 1),
            );
          } else {
            console.error('GoogleService.translate: giving up after retries', e);
          }
        }
      }
    };

    for (let i = 0; i < textsToTranslate.length; i += 1) {
      const text = textsToTranslate[i];
      if (currentBatchLength + text.length > BATCH_SIZE_CHARS) {
        await processBatch(currentBatch, currentBatchIndices);
        currentBatch = [];
        currentBatchIndices = [];
        currentBatchLength = 0;
      }
      currentBatch.push(text);
      currentBatchIndices.push(i);
      currentBatchLength += text.length;
    }

    if (currentBatch.length > 0) {
      await processBatch(currentBatch, currentBatchIndices);
    }

    const finalArray = [...texts];
    nonEmptyIndices.forEach((realIdx, mappedIdx) => {
      finalArray[realIdx] = translatedResults[mappedIdx];
    });

    return isArray ? finalArray : finalArray[0];
  }

  static async romanize<T extends RomanizableLine>(
    originalLyrics: T[] | { data?: T[]; content?: T[] },
  ): Promise<T[]> {
    const lines: T[] = Array.isArray(originalLyrics)
      ? originalLyrics
      : (originalLyrics as { data?: T[]; content?: T[] }).data ||
        (originalLyrics as { data?: T[]; content?: T[] }).content ||
        [];

    if (!lines || lines.length === 0)
      return Array.isArray(originalLyrics) ? originalLyrics : [];

    const isWordSynced = lines.some(
      (l: RomanizableLine) =>
        l.isWordSynced !== false && Array.isArray(l.text) && l.text.length > 1,
    );

    if (isWordSynced) {
      return this.romanizeWordSynced(lines);
    }

    return this.romanizeLineSynced(lines);
  }

  static async romanizeWordSynced<T extends RomanizableLine>(
    lines: T[],
  ): Promise<T[]> {
    return Promise.all(
      lines.map(async (line: T) => {
        if (
          !line.text ||
          !Array.isArray(line.text) ||
          line.text.length === 0 ||
          line.romanizedText
        )
          return line;

        const fullText = line.text
          .map((s: { text: string }) => s.text)
          .join('');

        const [romanizedFullLine] = await this.romanizeTexts([fullText]);

        const newSyllabus = line.text.map(
          (s: { text: string; romanizedText?: string }) => ({
            ...s,
            romanizedText: s.romanizedText,
          }),
        );

        return {
          ...line,
          text: newSyllabus,
          romanizedText: romanizedFullLine || '',
        };
      }),
    );
  }

  static async romanizeLineSynced<T extends RomanizableLine>(
    lines: T[],
  ): Promise<T[]> {
    const linesToRomanize = lines.map((line: T) => {
      if (line.romanizedText) {
        return '';
      }
      if (Array.isArray(line.text) && line.text.length > 0) {
        return line.text.map((s: { text: string }) => s.text).join('');
      }
      return '';
    });

    const romanizedLines = await this.romanizeTexts(linesToRomanize);

    return lines.map((line: T, index: number) => ({
      ...line,
      romanizedText: romanizedLines[index] || '',
    }));
  }

  static async romanizeTexts(texts: string[]): Promise<string[]> {
    const contextText = texts.join(' ');

    if (GoogleService.isPurelyLatinScript(contextText)) {
      return texts;
    }

    const romanizedTexts: string[] = [];

    for (const text of texts) {
      if (!text || GoogleService.isPurelyLatinScript(text)) {
        romanizedTexts.push(text);
      } else {
        let attempt = 0;
        let success = false;
        let lastError = null;

        while (attempt < CONFIG.GOOGLE.MAX_RETRIES && !success) {
          try {
            const romanizeUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&q=${encodeURIComponent(
              text,
            )}`;
            const response = await GoogleService.fetchWithTimeout(romanizeUrl);
            const data = await response.json();

            const romanized = data?.[0]?.[0]?.[3] || text;

            romanizedTexts.push(romanized);
            success = true;
          } catch (error) {
            lastError = error;
            console.warn(
              `GoogleService: Error romanizing text "${text}" (attempt ${
                attempt + 1
              }/${CONFIG.GOOGLE.MAX_RETRIES}):`,
              error,
            );
            attempt += 1;
            if (attempt < CONFIG.GOOGLE.MAX_RETRIES) {
              await GoogleService.delay(
                CONFIG.GOOGLE.RETRY_DELAY_MS * 2 ** (attempt - 1),
              );
            }
          }
        }

        if (!success) {
          console.error(
            `GoogleService: Failed to romanize text "${text}" after ${CONFIG.GOOGLE.MAX_RETRIES} attempts. Last error:`,
            lastError,
          );
          romanizedTexts.push(text);
        }
      }
    }

    return romanizedTexts;
  }
}
