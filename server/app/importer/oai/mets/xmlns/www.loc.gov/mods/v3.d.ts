import * as Primitive from '../../xml-primitives';
import * as xlink from '../../www.w3.org/1999/xlink';
import * as xml from '../../www.w3.org/XML/1998/namespace';

// Source files:
// http://localhost:8080/mods-3-8-fixed.xsd


interface BaseType {
	_exists: boolean;
	_namespace: string;
}
interface _abstractDefinition extends _stringPlusLanguage {
	altFormat: string;
	altRepGroup: string;
	contentType: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	shareable: no;
	type: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
}
export interface abstractDefinition extends _abstractDefinition { constructor: { new(): abstractDefinition }; }
export var abstractDefinition: { new(): abstractDefinition };

interface _accessConditionDefinition extends _extensionDefinition {
	altFormat: string;
	altRepGroup: string;
	authority: string;
	authorityURI: string;
	contentType: string;
	lang: string[];
	script: string;
	transliteration: string;
	valueURI: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
}
export interface accessConditionDefinition extends _accessConditionDefinition { constructor: { new(): accessConditionDefinition }; }
export var accessConditionDefinition: { new(): accessConditionDefinition };

interface _alternativeNameDefinition extends BaseType {
	altType: string;
	displayLabel: string;
	lang: string[];
	script: string;
	transliteration: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	$role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
	affiliation?: stringPlusLanguagePlusAuthority[];
	description?: stringPlusLanguage[];
	displayForm?: stringPlusLanguage[];
	nameIdentifier?: identifierDefinition[];
	namePart?: namePartDefinition[];
	role?: roleDefinition[];
}
export interface alternativeNameDefinition extends _alternativeNameDefinition { constructor: { new(): alternativeNameDefinition }; }
export var alternativeNameDefinition: { new(): alternativeNameDefinition };

interface _areaDefinition extends _hierarchicalPart {}
export interface areaDefinition extends _areaDefinition { constructor: { new(): areaDefinition }; }
export var areaDefinition: { new(): areaDefinition };

interface _cartographicsDefinition extends BaseType {
	authority: string;
	authorityURI: string;
	valueURI: string;
	cartographicExtension?: extensionDefinition[];
	coordinates?: stringPlusLanguage[];
	projection?: stringPlusLanguage;
	scale?: stringPlusLanguage;
}
export interface cartographicsDefinition extends _cartographicsDefinition { constructor: { new(): cartographicsDefinition }; }
export var cartographicsDefinition: { new(): cartographicsDefinition };

interface _citySectionDefinition extends _hierarchicalPart {}
export interface citySectionDefinition extends _citySectionDefinition { constructor: { new(): citySectionDefinition }; }
export var citySectionDefinition: { new(): citySectionDefinition };

interface _classificationDefinition extends _stringPlusLanguagePlusAuthority {
	altRepGroup: string;
	displayLabel: string;
	edition: string;
	generator: string;
	ID: string;
	IDREF: string;
	usage: usagePrimary;
}
export interface classificationDefinition extends _classificationDefinition { constructor: { new(): classificationDefinition }; }
export var classificationDefinition: { new(): classificationDefinition };

export type codeOrText = ("code" | "text");
interface _codeOrText extends Primitive._string { content: codeOrText; }

interface _copyInformationDefinition extends BaseType {
	electronicLocator?: stringPlusLanguage[];
	enumerationAndChronology?: enumerationAndChronologyDefinition[];
	form?: formDefinition;
	itemIdentifier?: itemIdentifierDefinition[];
	shelfLocator?: stringPlusLanguage[];
	subLocation?: stringPlusLanguage[];
}
export interface copyInformationDefinition extends _copyInformationDefinition { constructor: { new(): copyInformationDefinition }; }
export var copyInformationDefinition: { new(): copyInformationDefinition };

interface _dateDefinition extends _stringPlusLanguage {
	calendar: string;
	encoding: dateDefinitionEncodingType;
	keyDate: yes;
	point: dateDefinitionPointType;
	qualifier: dateDefinitionQualifierType;
}
export interface dateDefinition extends _dateDefinition { constructor: { new(): dateDefinition }; }
export var dateDefinition: { new(): dateDefinition };

type dateDefinitionEncodingType = ("w3cdtf" | "iso8601" | "marc" | "temper" | "edtf");
interface _dateDefinitionEncodingType extends Primitive._string { content: dateDefinitionEncodingType; }

type dateDefinitionPointType = ("start" | "end");
interface _dateDefinitionPointType extends Primitive._string { content: dateDefinitionPointType; }

type dateDefinitionQualifierType = ("approximate" | "inferred" | "questionable");
interface _dateDefinitionQualifierType extends Primitive._string { content: dateDefinitionQualifierType; }

interface _dateOtherDefinition extends _dateDefinition {
	type: string;
}
export interface dateOtherDefinition extends _dateOtherDefinition { constructor: { new(): dateOtherDefinition }; }
export var dateOtherDefinition: { new(): dateOtherDefinition };

interface _detailDefinition extends BaseType {
	level: number;
	type: string;
	caption: stringPlusLanguage[];
	number: stringPlusLanguage[];
	title: stringPlusLanguage[];
}
export interface detailDefinition extends _detailDefinition { constructor: { new(): detailDefinition }; }
export var detailDefinition: { new(): detailDefinition };

export type digitalOriginDefinition = ("born digital" | "reformatted digital" | "digitized microfilm" | "digitized other analog");
interface _digitalOriginDefinition extends Primitive._string { content: digitalOriginDefinition; }

interface _enumerationAndChronologyDefinition extends _stringPlusLanguage {
	unitType: enumerationAndChronologyDefinitionUnitTypeType;
}
export interface enumerationAndChronologyDefinition extends _enumerationAndChronologyDefinition { constructor: { new(): enumerationAndChronologyDefinition }; }
export var enumerationAndChronologyDefinition: { new(): enumerationAndChronologyDefinition };

type enumerationAndChronologyDefinitionUnitTypeType = ("1" | "2" | "3");
interface _enumerationAndChronologyDefinitionUnitTypeType extends Primitive._string { content: enumerationAndChronologyDefinitionUnitTypeType; }

interface _extensionDefinition extends BaseType {
	displayLabel: string;
	ID: string;
	IDREF: string;
	type: string;
}
export interface extensionDefinition extends _extensionDefinition { constructor: { new(): extensionDefinition }; }
export var extensionDefinition: { new(): extensionDefinition };

interface _extentDefinition extends BaseType {
	unit: string;
	end?: stringPlusLanguage;
	list?: stringPlusLanguage;
	start?: stringPlusLanguage;
	total?: number;
}
export interface extentDefinition extends _extentDefinition { constructor: { new(): extentDefinition }; }
export var extentDefinition: { new(): extentDefinition };

interface _extentType extends _stringPlusLanguagePlusSupplied {}
export interface extentType extends _extentType { constructor: { new(): extentType }; }
export var extentType: { new(): extentType };

interface _formDefinition extends _stringPlusLanguagePlusAuthority {
	type: string;
}
export interface formDefinition extends _formDefinition { constructor: { new(): formDefinition }; }
export var formDefinition: { new(): formDefinition };

interface _genreDefinition extends _stringPlusLanguagePlusAuthority {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	type: string;
	usage: usagePrimary;
}
export interface genreDefinition extends _genreDefinition { constructor: { new(): genreDefinition }; }
export var genreDefinition: { new(): genreDefinition };

interface _hierarchicalGeographicDefinition extends BaseType {
	authority: string;
	authorityURI: string;
	valueURI: string;
	area: areaDefinition[];
	city: hierarchicalPart[];
	citySection: citySectionDefinition[];
	continent: hierarchicalPart[];
	country: hierarchicalPart[];
	county: hierarchicalPart[];
	extraTerrestrialArea: hierarchicalPart[];
	island: hierarchicalPart[];
	province: stringPlusLanguage[];
	region: regionDefinition[];
	state: stateDefinition[];
	territory: hierarchicalPart[];
}
export interface hierarchicalGeographicDefinition extends _hierarchicalGeographicDefinition { constructor: { new(): hierarchicalGeographicDefinition }; }
export var hierarchicalGeographicDefinition: { new(): hierarchicalGeographicDefinition };

interface _hierarchicalPart extends _stringPlusLanguage {
	authority: string;
	authorityURI: string;
	valueURI: string;
}
export interface hierarchicalPart extends _hierarchicalPart { constructor: { new(): hierarchicalPart }; }
export var hierarchicalPart: { new(): hierarchicalPart };

interface _holdingSimpleDefinition extends BaseType {
	copyInformation: copyInformationDefinition[];
}
export interface holdingSimpleDefinition extends _holdingSimpleDefinition { constructor: { new(): holdingSimpleDefinition }; }
export var holdingSimpleDefinition: { new(): holdingSimpleDefinition };

interface _identifierDefinition extends _stringPlusLanguage {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	invalid: yes;
	type: string;
	typeURI: string;
}
export interface identifierDefinition extends _identifierDefinition { constructor: { new(): identifierDefinition }; }
export var identifierDefinition: { new(): identifierDefinition };

export type issuanceDefinition = ("continuing" | "monographic" | "single unit" | "multipart monograph" | "serial" | "integrating resource");
interface _issuanceDefinition extends Primitive._string { content: issuanceDefinition; }

interface _itemIdentifierDefinition extends _stringPlusLanguage {
	type: string;
}
export interface itemIdentifierDefinition extends _itemIdentifierDefinition { constructor: { new(): itemIdentifierDefinition }; }
export var itemIdentifierDefinition: { new(): itemIdentifierDefinition };

interface _languageDefinition extends BaseType {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	objectPart: string;
	script: string;
	transliteration: string;
	usage: usagePrimary;
	languageTerm: languageTermDefinition[];
	scriptTerm?: scriptTermDefinition[];
}
export interface languageDefinition extends _languageDefinition { constructor: { new(): languageDefinition }; }
export var languageDefinition: { new(): languageDefinition };

interface _languageTermDefinition extends _stringPlusLanguagePlusAuthority {
	type: codeOrText;
}
export interface languageTermDefinition extends _languageTermDefinition { constructor: { new(): languageTermDefinition }; }
export var languageTermDefinition: { new(): languageTermDefinition };

interface _locationDefinition extends BaseType {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	script: string;
	transliteration: string;
	holdingExternal?: extensionDefinition;
	holdingSimple?: holdingSimpleDefinition;
	physicalLocation?: physicalLocationDefinition[];
	shelfLocator?: stringPlusLanguage[];
	url?: urlDefinition[];
}
export interface locationDefinition extends _locationDefinition { constructor: { new(): locationDefinition }; }
export var locationDefinition: { new(): locationDefinition };

interface _modsCollectionDefinition extends BaseType {
	mods: modsDefinition[];
}
export interface modsCollectionDefinition extends _modsCollectionDefinition { constructor: { new(): modsCollectionDefinition }; }
export var modsCollectionDefinition: { new(): modsCollectionDefinition };

interface _modsDefinition extends BaseType {
	ID: string;
	IDREF: string;
	version: modsDefinitionVersionType;
	abstract: abstractDefinition[];
	accessCondition: accessConditionDefinition[];
	classification: classificationDefinition[];
	extension: extensionDefinition[];
	genre: genreDefinition[];
	identifier: identifierDefinition[];
	language: languageDefinition[];
	location: locationDefinition[];
	name: nameDefinition[];
	note: noteDefinition[];
	originInfo: originInfoDefinition[];
	part: partDefinition[];
	physicalDescription: physicalDescriptionDefinition[];
	recordInfo: recordInfoDefinition[];
	relatedItem: relatedItemDefinition[];
	subject: subjectDefinition[];
	tableOfContents: tableOfContentsDefinition[];
	targetAudience: targetAudienceDefinition[];
	titleInfo: titleInfoDefinition[];
	typeOfResource: typeOfResourceDefinition[];
}
export interface modsDefinition extends _modsDefinition { constructor: { new(): modsDefinition }; }
export var modsDefinition: { new(): modsDefinition };

type modsDefinitionVersionType = ("3.8" | "3.7" | "3.6" | "3.5" | "3.4" | "3.3" | "3.2" | "3.1" | "3.0");
interface _modsDefinitionVersionType extends Primitive._string { content: modsDefinitionVersionType; }

interface _nameDefinition extends BaseType {
	altRepGroup: string;
	authority: string;
	authorityURI: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	nameTitleGroup: string;
	script: string;
	supplied: yes;
	transliteration: string;
	type: nameDefinitionTypeType;
	usage: usagePrimary;
	valueURI: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	$role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
	affiliation?: stringPlusLanguagePlusAuthority[];
	alternativeName?: alternativeNameDefinition[];
	description?: stringPlusLanguage[];
	displayForm?: stringPlusLanguage[];
	etal: stringPlusLanguage;
	nameIdentifier?: identifierDefinition[];
	namePart?: namePartDefinition[];
	role?: roleDefinition[];
}
export interface nameDefinition extends _nameDefinition { constructor: { new(): nameDefinition }; }
export var nameDefinition: { new(): nameDefinition };

type nameDefinitionTypeType = ("personal" | "corporate" | "conference" | "family");
interface _nameDefinitionTypeType extends Primitive._string { content: nameDefinitionTypeType; }

interface _namePartDefinition extends _stringPlusLanguage {
	type: namePartDefinitionTypeType;
}
export interface namePartDefinition extends _namePartDefinition { constructor: { new(): namePartDefinition }; }
export var namePartDefinition: { new(): namePartDefinition };

type namePartDefinitionTypeType = ("date" | "family" | "given" | "termsOfAddress");
interface _namePartDefinitionTypeType extends Primitive._string { content: namePartDefinitionTypeType; }

export type no = "no";
interface _no extends Primitive._string { content: no; }

interface _nonSortType extends _stringPlusLanguage {
	space: xml.SpaceType;
}
export interface nonSortType extends _nonSortType { constructor: { new(): nonSortType }; }
export var nonSortType: { new(): nonSortType };

interface _noteDefinition extends _stringPlusLanguage {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	type: string;
	typeURI: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
}
export interface noteDefinition extends _noteDefinition { constructor: { new(): noteDefinition }; }
export var noteDefinition: { new(): noteDefinition };

interface _originInfoDefinition extends BaseType {
	altRepGroup: string;
	displayLabel: string;
	eventType: string;
	eventTypeURI: string;
	ID: string;
	IDREF: string;
	lang: string[];
	script: string;
	transliteration: string;
	agent: nameDefinition[];
	copyrightDate: dateDefinition[];
	dateCaptured: dateDefinition[];
	dateCreated: dateDefinition[];
	dateIssued: dateDefinition[];
	dateModified: dateDefinition[];
	dateOther: dateOtherDefinition[];
	dateValid: dateDefinition[];
	displayDate: string[];
	edition: stringPlusLanguagePlusSupplied[];
	frequency: stringPlusLanguagePlusAuthority[];
	issuance: issuanceDefinition[];
	place: placeDefinition[];
	publisher: publisherDefinition[];
}
export interface originInfoDefinition extends _originInfoDefinition { constructor: { new(): originInfoDefinition }; }
export var originInfoDefinition: { new(): originInfoDefinition };

interface _partDefinition extends BaseType {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	order: number;
	script: string;
	transliteration: string;
	type: string;
	date?: dateDefinition[];
	detail?: detailDefinition[];
	extent?: extentDefinition[];
}
export interface partDefinition extends _partDefinition { constructor: { new(): partDefinition }; }
export var partDefinition: { new(): partDefinition };

interface _physicalDescriptionDefinition extends BaseType {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	script: string;
	transliteration: string;
	digitalOrigin: digitalOriginDefinition[];
	extent: extentType[];
	form: formDefinition[];
	internetMediaType: stringPlusLanguage[];
	note: physicalDescriptionNote[];
	reformattingQuality: reformattingQualityDefinition[];
}
export interface physicalDescriptionDefinition extends _physicalDescriptionDefinition { constructor: { new(): physicalDescriptionDefinition }; }
export var physicalDescriptionDefinition: { new(): physicalDescriptionDefinition };

interface _physicalDescriptionNote extends _stringPlusLanguage {
	displayLabel: string;
	ID: string;
	IDREF: string;
	type: string;
	typeURI: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
}
export interface physicalDescriptionNote extends _physicalDescriptionNote { constructor: { new(): physicalDescriptionNote }; }
export var physicalDescriptionNote: { new(): physicalDescriptionNote };

interface _physicalLocationDefinition extends _stringPlusLanguagePlusAuthority {
	displayLabel: string;
	type: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
}
export interface physicalLocationDefinition extends _physicalLocationDefinition { constructor: { new(): physicalLocationDefinition }; }
export var physicalLocationDefinition: { new(): physicalLocationDefinition };

interface _placeDefinition extends BaseType {
	supplied: yes;
	cartographics: cartographicsDefinition[];
	placeIdentifier: string[];
	placeTerm: placeTermDefinition[];
}
export interface placeDefinition extends _placeDefinition { constructor: { new(): placeDefinition }; }
export var placeDefinition: { new(): placeDefinition };

interface _placeTermDefinition extends _stringPlusLanguagePlusAuthority {
	type: codeOrText;
}
export interface placeTermDefinition extends _placeTermDefinition { constructor: { new(): placeTermDefinition }; }
export var placeTermDefinition: { new(): placeTermDefinition };

interface _publisherDefinition extends _stringPlusLanguagePlusSupplied {
	authority: string;
	authorityURI: string;
	valueURI: string;
}
export interface publisherDefinition extends _publisherDefinition { constructor: { new(): publisherDefinition }; }
export var publisherDefinition: { new(): publisherDefinition };

interface _recordIdentifierDefinition extends _stringPlusLanguage {
	source: string;
}
export interface recordIdentifierDefinition extends _recordIdentifierDefinition { constructor: { new(): recordIdentifierDefinition }; }
export var recordIdentifierDefinition: { new(): recordIdentifierDefinition };

interface _recordInfoDefinition extends BaseType {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	script: string;
	transliteration: string;
	usage: usagePrimary;
	descriptionStandard: stringPlusLanguagePlusAuthority[];
	languageOfCataloging: languageDefinition[];
	recordChangeDate: dateDefinition[];
	recordContentSource: stringPlusLanguagePlusAuthority[];
	recordCreationDate: dateDefinition[];
	recordIdentifier: recordIdentifierDefinition[];
	recordInfoNote: noteDefinition[];
	recordOrigin: stringPlusLanguage[];
}
export interface recordInfoDefinition extends _recordInfoDefinition { constructor: { new(): recordInfoDefinition }; }
export var recordInfoDefinition: { new(): recordInfoDefinition };

export type reformattingQualityDefinition = ("access" | "preservation" | "replacement");
interface _reformattingQualityDefinition extends Primitive._string { content: reformattingQualityDefinition; }

interface _regionDefinition extends _hierarchicalPart {}
export interface regionDefinition extends _regionDefinition { constructor: { new(): regionDefinition }; }
export var regionDefinition: { new(): regionDefinition };

interface _relatedItemDefinition extends BaseType {
	displayLabel: string;
	ID: string;
	IDREF: string;
	otherType: string;
	otherTypeAuth: string;
	otherTypeAuthURI: string;
	otherTypeURI: string;
	type: relatedItemDefinitionTypeType;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
	abstract?: abstractDefinition[];
	accessCondition?: accessConditionDefinition[];
	classification?: classificationDefinition[];
	extension?: extensionDefinition[];
	genre?: genreDefinition[];
	identifier?: identifierDefinition[];
	language?: languageDefinition[];
	location?: locationDefinition[];
	name?: nameDefinition[];
	note?: noteDefinition[];
	originInfo?: originInfoDefinition[];
	part?: partDefinition[];
	physicalDescription?: physicalDescriptionDefinition[];
	recordInfo?: recordInfoDefinition[];
	relatedItem?: relatedItemDefinition[];
	subject?: subjectDefinition[];
	tableOfContents?: tableOfContentsDefinition[];
	targetAudience?: targetAudienceDefinition[];
	titleInfo?: titleInfoDefinition[];
	typeOfResource?: typeOfResourceDefinition[];
}
export interface relatedItemDefinition extends _relatedItemDefinition { constructor: { new(): relatedItemDefinition }; }
export var relatedItemDefinition: { new(): relatedItemDefinition };

type relatedItemDefinitionTypeType = ("preceding" | "succeeding" | "original" | "host" | "constituent" | "series" | "otherVersion" | "otherFormat" | "isReferencedBy" | "references" | "reviewOf");
interface _relatedItemDefinitionTypeType extends Primitive._string { content: relatedItemDefinitionTypeType; }

interface _roleDefinition extends BaseType {
	roleTerm: roleTermDefinition[];
}
export interface roleDefinition extends _roleDefinition { constructor: { new(): roleDefinition }; }
export var roleDefinition: { new(): roleDefinition };

interface _roleTermDefinition extends _stringPlusLanguagePlusAuthority {
	type: codeOrText;
}
export interface roleTermDefinition extends _roleTermDefinition { constructor: { new(): roleTermDefinition }; }
export var roleTermDefinition: { new(): roleTermDefinition };

interface _scriptTermDefinition extends _stringPlusLanguagePlusAuthority {
	type: codeOrText;
}
export interface scriptTermDefinition extends _scriptTermDefinition { constructor: { new(): scriptTermDefinition }; }
export var scriptTermDefinition: { new(): scriptTermDefinition };

interface _stateDefinition extends _hierarchicalPart {}
export interface stateDefinition extends _stateDefinition { constructor: { new(): stateDefinition }; }
export var stateDefinition: { new(): stateDefinition };

interface _stringPlusLanguage extends Primitive._string {
	lang: string[];
	script: string;
	transliteration: string;
}
export interface stringPlusLanguage extends _stringPlusLanguage { constructor: { new(): stringPlusLanguage }; }
export var stringPlusLanguage: { new(): stringPlusLanguage };

interface _stringPlusLanguagePlusAuthority extends _stringPlusLanguage {
	authority: string;
	authorityURI: string;
	valueURI: string;
}
export interface stringPlusLanguagePlusAuthority extends _stringPlusLanguagePlusAuthority { constructor: { new(): stringPlusLanguagePlusAuthority }; }
export var stringPlusLanguagePlusAuthority: { new(): stringPlusLanguagePlusAuthority };

interface _stringPlusLanguagePlusSupplied extends _stringPlusLanguage {
	supplied: yes;
}
export interface stringPlusLanguagePlusSupplied extends _stringPlusLanguagePlusSupplied { constructor: { new(): stringPlusLanguagePlusSupplied }; }
export var stringPlusLanguagePlusSupplied: { new(): stringPlusLanguagePlusSupplied };

interface _subjectDefinition extends BaseType {
	altRepGroup: string;
	authority: string;
	authorityURI: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	script: string;
	transliteration: string;
	usage: usagePrimary;
	valueURI: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
	cartographics?: cartographicsDefinition[];
	genre?: genreDefinition[];
	geographic?: stringPlusLanguagePlusAuthority[];
	geographicCode?: stringPlusLanguagePlusAuthority[];
	hierarchicalGeographic?: hierarchicalGeographicDefinition[];
	name?: subjectNameDefinition[];
	occupation?: stringPlusLanguagePlusAuthority[];
	temporal?: temporalDefinition[];
	titleInfo?: subjectTitleInfoDefinition[];
	topic?: stringPlusLanguagePlusAuthority[];
}
export interface subjectDefinition extends _subjectDefinition { constructor: { new(): subjectDefinition }; }
export var subjectDefinition: { new(): subjectDefinition };

interface _subjectNameDefinition extends BaseType {
	authority: string;
	authorityURI: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	script: string;
	transliteration: string;
	type: subjectNameDefinitionTypeType;
	valueURI: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	$role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
	affiliation?: stringPlusLanguagePlusAuthority[];
	description?: stringPlusLanguage[];
	displayForm?: stringPlusLanguage[];
	nameIdentifier?: identifierDefinition[];
	namePart?: namePartDefinition[];
	role?: roleDefinition[];
}
export interface subjectNameDefinition extends _subjectNameDefinition { constructor: { new(): subjectNameDefinition }; }
export var subjectNameDefinition: { new(): subjectNameDefinition };

type subjectNameDefinitionTypeType = ("personal" | "corporate" | "conference" | "family");
interface _subjectNameDefinitionTypeType extends Primitive._string { content: subjectNameDefinitionTypeType; }

interface _subjectTitleInfoDefinition extends BaseType {
	authority: string;
	authorityURI: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	otherTypeAuth: string;
	otherTypeAuthURI: string;
	otherTypeURI: string;
	script: string;
	transliteration: string;
	type: subjectTitleInfoDefinitionTypeType;
	valueURI: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	$title?: string;
	type: string;
	nonSort?: nonSortType[];
	partName?: stringPlusLanguage[];
	partNumber?: stringPlusLanguage[];
	subTitle?: stringPlusLanguage[];
	title?: stringPlusLanguage[];
}
export interface subjectTitleInfoDefinition extends _subjectTitleInfoDefinition { constructor: { new(): subjectTitleInfoDefinition }; }
export var subjectTitleInfoDefinition: { new(): subjectTitleInfoDefinition };

type subjectTitleInfoDefinitionTypeType = ("abbreviated" | "translated" | "alternative" | "uniform");
interface _subjectTitleInfoDefinitionTypeType extends Primitive._string { content: subjectTitleInfoDefinitionTypeType; }

interface _tableOfContentsDefinition extends _stringPlusLanguage {
	altFormat: string;
	altRepGroup: string;
	contentType: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	shareable: no;
	type: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	title?: string;
	type: string;
}
export interface tableOfContentsDefinition extends _tableOfContentsDefinition { constructor: { new(): tableOfContentsDefinition }; }
export var tableOfContentsDefinition: { new(): tableOfContentsDefinition };

interface _targetAudienceDefinition extends _stringPlusLanguagePlusAuthority {
	altRepGroup: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
}
export interface targetAudienceDefinition extends _targetAudienceDefinition { constructor: { new(): targetAudienceDefinition }; }
export var targetAudienceDefinition: { new(): targetAudienceDefinition };

interface _temporalDefinition extends _dateDefinition {
	authority: string;
	authorityURI: string;
	valueURI: string;
}
export interface temporalDefinition extends _temporalDefinition { constructor: { new(): temporalDefinition }; }
export var temporalDefinition: { new(): temporalDefinition };

interface _titleInfoDefinition extends BaseType {
	altFormat: string;
	altRepGroup: string;
	authority: string;
	authorityURI: string;
	contentType: string;
	displayLabel: string;
	ID: string;
	IDREF: string;
	lang: string[];
	nameTitleGroup: string;
	otherTypeAuth: string;
	otherTypeAuthURI: string;
	otherTypeURI: string;
	script: string;
	supplied: yes;
	transliteration: string;
	type: titleInfoDefinitionTypeType;
	usage: usagePrimary;
	valueURI: string;
	actuate?: xlink.ActuateType;
	arcrole?: string;
	href?: string;
	role?: string;
	show?: xlink.ShowType;
	$title?: string;
	type: string;
	nonSort?: nonSortType[];
	partName?: stringPlusLanguage[];
	partNumber?: stringPlusLanguage[];
	subTitle?: stringPlusLanguage[];
	title?: stringPlusLanguage[];
}
export interface titleInfoDefinition extends _titleInfoDefinition { constructor: { new(): titleInfoDefinition }; }
export var titleInfoDefinition: { new(): titleInfoDefinition };

type titleInfoDefinitionTypeType = ("abbreviated" | "translated" | "alternative" | "uniform");
interface _titleInfoDefinitionTypeType extends Primitive._string { content: titleInfoDefinitionTypeType; }

interface _typeOfResourceDefinition extends _stringPlusLanguagePlusAuthority {
	altRepGroup: string;
	collection: yes;
	displayLabel: string;
	ID: string;
	IDREF: string;
	manuscript: yes;
	usage: usagePrimary;
}
export interface typeOfResourceDefinition extends _typeOfResourceDefinition { constructor: { new(): typeOfResourceDefinition }; }
export var typeOfResourceDefinition: { new(): typeOfResourceDefinition };

interface _urlDefinition extends Primitive._string {
	access: urlDefinitionAccessType;
	dateLastAccessed: string;
	displayLabel: string;
	note: string;
	usage: urlDefinitionUsageType;
}
export interface urlDefinition extends _urlDefinition { constructor: { new(): urlDefinition }; }
export var urlDefinition: { new(): urlDefinition };

type urlDefinitionAccessType = ("preview" | "raw object" | "object in context");
interface _urlDefinitionAccessType extends Primitive._string { content: urlDefinitionAccessType; }

type urlDefinitionUsageType = ("primary display" | "primary");
interface _urlDefinitionUsageType extends Primitive._string { content: urlDefinitionUsageType; }

export type usagePrimary = "primary";
interface _usagePrimary extends Primitive._string { content: usagePrimary; }

export type yes = "yes";
interface _yes extends Primitive._string { content: yes; }

export interface document extends BaseType {
	abstract: abstractDefinition;
	accessCondition: accessConditionDefinition;
	affiliation: stringPlusLanguagePlusAuthority;
	agent: nameDefinition;
	alternativeName: alternativeNameDefinition;
	area: areaDefinition;
	caption: stringPlusLanguage;
	cartographicExtension: extensionDefinition;
	cartographics: cartographicsDefinition;
	city: hierarchicalPart;
	citySection: citySectionDefinition;
	classification: classificationDefinition;
	continent: hierarchicalPart;
	coordinates: stringPlusLanguage;
	copyInformation: copyInformationDefinition;
	copyrightDate: dateDefinition;
	country: hierarchicalPart;
	county: hierarchicalPart;
	date: dateDefinition;
	dateCaptured: dateDefinition;
	dateCreated: dateDefinition;
	dateIssued: dateDefinition;
	dateModified: dateDefinition;
	dateOther: dateOtherDefinition;
	dateValid: dateDefinition;
	description: stringPlusLanguage;
	descriptionStandard: stringPlusLanguagePlusAuthority;
	detail: detailDefinition;
	digitalOrigin: digitalOriginDefinition;
	displayDate: string;
	displayForm: stringPlusLanguage;
	edition: stringPlusLanguagePlusSupplied;
	electronicLocator: stringPlusLanguage;
	end: stringPlusLanguage;
	enumerationAndChronology: enumerationAndChronologyDefinition;
	etal: stringPlusLanguage;
	extension: extensionDefinition;
	extent: extentType;
	extraTerrestrialArea: hierarchicalPart;
	form: formDefinition;
	frequency: stringPlusLanguagePlusAuthority;
	genre: genreDefinition;
	geographic: stringPlusLanguagePlusAuthority;
	geographicCode: stringPlusLanguagePlusAuthority;
	hierarchicalGeographic: hierarchicalGeographicDefinition;
	holdingExternal: extensionDefinition;
	holdingSimple: holdingSimpleDefinition;
	identifier: identifierDefinition;
	internetMediaType: stringPlusLanguage;
	island: hierarchicalPart;
	issuance: issuanceDefinition;
	itemIdentifier: itemIdentifierDefinition;
	language: languageDefinition;
	languageOfCataloging: languageDefinition;
	languageTerm: languageTermDefinition;
	list: stringPlusLanguage;
	location: locationDefinition;
	mods: modsDefinition;
	modsCollection: modsCollectionDefinition;
	name: nameDefinition;
	nameIdentifier: identifierDefinition;
	namePart: namePartDefinition;
	nonSort: nonSortType;
	note: noteDefinition;
	number: stringPlusLanguage;
	occupation: stringPlusLanguagePlusAuthority;
	originInfo: originInfoDefinition;
	part: partDefinition;
	partName: stringPlusLanguage;
	partNumber: stringPlusLanguage;
	physicalDescription: physicalDescriptionDefinition;
	physicalLocation: physicalLocationDefinition;
	place: placeDefinition;
	placeIdentifier: string;
	placeTerm: placeTermDefinition;
	projection: stringPlusLanguage;
	province: stringPlusLanguage;
	publisher: publisherDefinition;
	recordChangeDate: dateDefinition;
	recordContentSource: stringPlusLanguagePlusAuthority;
	recordCreationDate: dateDefinition;
	recordIdentifier: recordIdentifierDefinition;
	recordInfo: recordInfoDefinition;
	recordInfoNote: noteDefinition;
	recordOrigin: stringPlusLanguage;
	reformattingQuality: reformattingQualityDefinition;
	region: regionDefinition;
	relatedItem: relatedItemDefinition;
	role: roleDefinition;
	roleTerm: roleTermDefinition;
	scale: stringPlusLanguage;
	scriptTerm: scriptTermDefinition;
	shelfLocator: stringPlusLanguage;
	start: stringPlusLanguage;
	state: stateDefinition;
	subject: subjectDefinition;
	subLocation: stringPlusLanguage;
	subTitle: stringPlusLanguage;
	tableOfContents: tableOfContentsDefinition;
	targetAudience: targetAudienceDefinition;
	temporal: temporalDefinition;
	territory: hierarchicalPart;
	title: stringPlusLanguage;
	titleInfo: titleInfoDefinition;
	topic: stringPlusLanguagePlusAuthority;
	total: number;
	typeOfResource: typeOfResourceDefinition;
	url: urlDefinition;
}
export var document: document;
