import { estimateTokens } from './tokens.js';

// A fake LLM for development and tests. No network, no cost.
export function createMockClient() {
  return {
    provider: 'mock',
    model: 'mock',
    async countTokens(text) {
      return estimateTokens(text);
    },
    async generate({ prompt, jsonSchema }) {
      const props = Object.keys(jsonSchema?.properties ?? {});
      let obj;
      if (props.includes('sections')) {
        const nums = [...prompt.matchAll(/\[P(\d+)\]/g)].map((m) => Number(m[1]));
        const n = nums.length ? Math.max(...nums) : 1;
        const mid = Math.ceil(n / 2);
        const sections =
          n === 1
            ? [{ title: 'Mock section', summary: 'Mock.', startParagraph: 1, endParagraph: 1 }]
            : [
                { title: 'Mock part 1', summary: 'Mock.', startParagraph: 1, endParagraph: mid },
                { title: 'Mock part 2', summary: 'Mock.', startParagraph: mid + 1, endParagraph: n },
              ];
        obj = {
          chapterTitle: 'Mock chapter',
          chapterSummary: 'This is a fake summary produced by the mock client.',
          sections,
          storySoFar: 'Mock story so far.',
          characters: [{ name: 'Mock Character', role: 'placeholder' }],
        };
      } else if (props.includes('overview')) {
        obj = {
          overview: 'Fake overview from the mock client.',
          themes: ['mock theme'],
          mainCharacters: [{ name: 'Mock Character', role: 'placeholder' }],
        };
      } else {
        obj = { greeting: 'hello from the mock', number: 7 };
      }
      const text = jsonSchema ? JSON.stringify(obj) : 'mock reply';
      return {
        text,
        finishReason: 'STOP',
        usage: {
          promptTokens: estimateTokens(prompt),
          outputTokens: estimateTokens(text),
          thinkingTokens: 0,
          totalTokens: estimateTokens(prompt) + estimateTokens(text),
        },
      };
    },
    // async generate({ prompt, jsonSchema }) {
    //   const text = jsonSchema
    //     ? JSON.stringify({ greeting: 'hello from the mock', number: 7 })
    //     : 'mock reply';
    //   return {
    //     text,
    //     finishReason: 'STOP',
    //     usage: {
    //       promptTokens: estimateTokens(prompt),
    //       outputTokens: estimateTokens(text),
    //       thinkingTokens: 0,
    //       totalTokens: estimateTokens(prompt) + estimateTokens(text),
    //     },
    //   };
    // },
  };
}