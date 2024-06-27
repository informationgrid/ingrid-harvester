import * as Primitive from '../../xml-primitives';

// Source files:
// http://www.loc.gov/standards/xlink/xlink.xsd


interface BaseType {
	_exists: boolean;
	_namespace: string;
}
export type ActuateType = ("onLoad" | "onRequest" | "other" | "none");
interface _ActuateType extends Primitive._string { content: ActuateType; }

export type ShowType = ("new" | "replace" | "embed" | "other" | "none");
interface _ShowType extends Primitive._string { content: ShowType; }

export interface document extends BaseType {
}
export var document: document;
