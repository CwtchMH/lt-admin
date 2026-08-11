import assert from 'node:assert/strict'

import {
    escapeCsvCell,
    escapeHtmlCell,
    sanitizeSpreadsheetCell,
} from './spreadsheetExport.js'

assert.equal(sanitizeSpreadsheetCell('=cmd'), "'=cmd")
assert.equal(sanitizeSpreadsheetCell('+SUM(1,2)'), "'+SUM(1,2)")
assert.equal(sanitizeSpreadsheetCell('-cmd'), "'-cmd")
assert.equal(sanitizeSpreadsheetCell('@cmd'), "'@cmd")
assert.equal(sanitizeSpreadsheetCell('   =cmd'), "'   =cmd")
assert.equal(sanitizeSpreadsheetCell('safe'), 'safe')

assert.equal(escapeCsvCell('=cmd'), '"\'=cmd"')
assert.equal(escapeCsvCell('a "quoted" value'), '"a ""quoted"" value"')
assert.equal(escapeHtmlCell('=cmd<script>'), "'=cmd&lt;script&gt;")
