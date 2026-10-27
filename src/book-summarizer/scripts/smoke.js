import { createLLM } from '../src/llm/index.js';

const llm = createLLM();
const schema = {
  type: 'object',
  properties: { greeting: { type: 'string' }, number: { type: 'integer' } },
  required: ['greeting', 'number'],
  additionalProperties: false,
};

const res = await llm.generate({
  step: 'smoke',
  prompt: 'Reply with a short greeting and the number 7.',
  jsonSchema: schema,
  maxOutputTokens: 1024,
});

console.log(res);
console.log('Parsed:', JSON.parse(res.text));
console.log('Token estimate for a sentence:', await llm.countTokens('Hello, this is a test.'));