var cxml = require("cxml");
var Primitive = require('../../../xml-primitives');

cxml.register('http://www.w3.org/XML/1998/namespace', exports, [
	[Primitive, ['string'], []]
], [
	'SpaceType'
], [
	[0, 0, [], [[1, 0], [2, 0], [4, 0], [3, 0]]],
	[3, 1, [], []],
	[3, 1, [], []]
], [
	['base', [1], 0],
	['id', [1], 0],
	['space', [2], 0],
	['lang', [3], 0]
]);