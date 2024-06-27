var cxml = require("cxml");
var Primitive = require('../../xml-primitives');

cxml.register('http://www.w3.org/1999/xlink', exports, [
	[Primitive, ['string'], []]
], [
	'ActuateType',
	'ShowType'
], [
	[0, 0, [], [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0]]],
	[3, 1, [], []],
	[3, 1, [], []]
], [
	['actuate', [2], 0],
	['arcrole', [1], 0],
	['from', [1], 0],
	['href', [1], 0],
	['label', [1], 0],
	['role', [1], 0],
	['show', [3], 0],
	['title', [1], 0],
	['to', [1], 0],
	['type', [1], 0]
]);