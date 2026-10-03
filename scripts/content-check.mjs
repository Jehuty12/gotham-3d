import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { contentFixture } from './content-fixture.mjs';
import { validateContent } from '../src/content/ContentValidation.js';
const fixture=contentFixture();
try{
  const report={date:new Date().toISOString(),...validateContent(fixture.content)};
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/content-check.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));assert.deepEqual(report.errors,[]);
}finally{fixture.dispose();}
