import { Parser, Quad } from 'n3';
import { blanknodeify } from 'odrl-evaluator';
import { isomorphic } from 'rdf-isomorphic';
import { describe, expect, it } from 'vitest';
import { ShapeConstraintValidator } from '../src/ShapeValidation';

const validSotw = `
@prefix ex:      <http://example.com/> .
@prefix dct:     <http://purl.org/dc/terms/>.
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pay:     <https://reference.data.gov.uk/def/payment#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .

ex:sotw a sotw:SotW ;
    sotw:context ex:event, ex:payment .

ex:event a pilots:ServiceUpdate, pilots:purchaseCertificate ;
    pilots:serviceDefinitionId pilots:WeighingServiceDescription; 
    pilots:serviceInstanceId <urn:uuid:3977d047-322c-4fa9-8f23-7074aa154284> ; 
    pilots:previousState pilots:certificateCreated ;
    pilots:newState pilots:certificatePurchased ;
    pilots:paymentReference ex:payment ;
    dct:issued "2025-11-24T11:44:22"^^xsd:dateTime . 

`
const sotwNoServiceUpdate =`
@prefix ex:      <http://example.com/> .
@prefix dct:     <http://purl.org/dc/terms/>.
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pay:     <https://reference.data.gov.uk/def/payment#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .

ex:sotw a sotw:SotW ;
    sotw:context ex:event, ex:payment .

ex:event a pilots:ServiceUpdate, pilots:purchaseCertificate ;
    pilots:serviceDefinitionId pilots:WeighingServiceDescription; 
    pilots:newState pilots:certificatePurchased ;
    pilots:previousState pilots:certificateCreated ;
    pilots:paymentReference ex:payment ;
    dct:issued "2025-11-24T11:44:22"^^xsd:dateTime . 

`

const sotwNoPurchaseCertificate =`
@prefix ex:      <http://example.com/> .
@prefix dct:     <http://purl.org/dc/terms/>.
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pay:     <https://reference.data.gov.uk/def/payment#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .

ex:sotw a sotw:SotW ;
    sotw:context ex:event, ex:payment .

ex:event a pilots:ServiceUpdate, pilots:purchaseCertificate ;
    pilots:serviceDefinitionId pilots:WeighingServiceDescription; 
    pilots:serviceInstanceId <urn:uuid:3977d047-322c-4fa9-8f23-7074aa154284> ; 
    pilots:previousState pilots:certificateCreated ;
    pilots:newState pilots:certificatePurchased ;
    dct:issued "2025-11-24T11:44:22"^^xsd:dateTime . 

`

// shapes at root of the repository at 12/10/2026
const shapes = `
@prefix sh:      <http://www.w3.org/ns/shacl#> .
@prefix rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .
@prefix dct:     <http://purl.org/dc/terms/> .
@prefix pilots:  <https://pilots-project.be/ns#> .

pilots:PilotsEventShape
    a sh:NodeShape ;
    sh:targetClass pilots:ServiceUpdate ;

    sh:property [
        sh:path pilots:serviceDefinitionId ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:message "A ServiceUpdate must contain exactly one serviceDefinitionId IRI." ;
    ] ;

    sh:property [
        sh:path pilots:serviceInstanceId ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:message "A ServiceUpdate must contain exactly one serviceInstanceId IRI." ;
    ] ;

    sh:property [
        sh:path pilots:previousState ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:message "A ServiceUpdate must contain exactly one previousState IRI." ;
    ] ;

    sh:property [
        sh:path pilots:newState ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:message "A ServiceUpdate must contain exactly one newState IRI." ;
    ] ;

    sh:property [
        sh:path dct:issued ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:datatype xsd:dateTime ;
        sh:message "A ServiceUpdate must contain exactly one issued timestamp of type xsd:dateTime." ;
    ] .

pilots:PurchaseCertificateShape
    a sh:NodeShape ;

    sh:targetClass pilots:purchaseCertificate ;

    sh:property [
        sh:path pilots:previousState ;
        sh:hasValue pilots:certificateCreated ;
        sh:message "purchaseCertificate events must have previousState certificateCreated." ;
    ] ;

    sh:property [
        sh:path pilots:newState ;
        sh:hasValue pilots:certificatePurchased ;
        sh:message "purchaseCertificate events must have newState certificatePurchased." ;
    ] ;

    sh:property [
        sh:path pilots:paymentReference ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:message "purchaseCertificate events must contain exactly one paymentReference." ;
    ] .
`


// a policy with one constraint per shape
const policy = `
@prefix ex:            <http://example.com/> .
@prefix odrl:          <http://www.w3.org/ns/odrl/2/> .
@prefix pilots:        <https://pilots-project.be/ns#> .
@prefix pilotsProfile: <https://pilots-project.be/odrlProfile/> .
 
ex:policy a odrl:Set ;
    odrl:permission [
        odrl:target ex:containerWeight ;
        odrl:action odrl:read ;
        odrl:constraint ex:eventConstraint, ex:purchaseCertificateConstraint
    ] .
 
ex:eventConstraint odrl:leftOperand pilotsProfile:shape ;
    odrl:operator odrl:eq ;
    odrl:rightOperand pilots:PilotsEventShape .
 
ex:purchaseCertificateConstraint odrl:leftOperand pilotsProfile:shape ;
    odrl:operator odrl:eq ;
    odrl:rightOperand pilots:PurchaseCertificateShape .
`

const policyWithoutConstraints =`
@prefix ex:            <http://example.com/> .
@prefix odrl:          <http://www.w3.org/ns/odrl/2/> .
@prefix pilots:        <https://pilots-project.be/ns#> .
@prefix pilotsProfile: <https://pilots-project.be/odrlProfile/> .
 
ex:policy a odrl:Set ;
    odrl:permission [
        odrl:target ex:containerWeight ;
        odrl:action odrl:read ;
    ] .
 
`
 
// Expected output: one validation report per shape, linked to its shape.
// The report IRIs (random urn:uuid) and the property shapes (blank nodes) are written as blank nodes.
const expectedValid = `
@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix pilots: <https://pilots-project.be/ns#> .
 
[] a sh:ValidationReport ;
    sh:conforms true ;
    <http://example.org/validatedShape> pilots:PilotsEventShape .
 
[] a sh:ValidationReport ;
    sh:conforms true ;
    <http://example.org/validatedShape> pilots:PurchaseCertificateShape .
`
 
const expectedNoServiceUpdate = `
@prefix ex:     <http://example.com/> .
@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix pilots: <https://pilots-project.be/ns#> .
 
[] a sh:ValidationReport ;
    sh:conforms false ;
    sh:result [
        a sh:ValidationResult ;
        sh:focusNode ex:event ;
        sh:resultPath pilots:serviceInstanceId ;
        sh:resultSeverity sh:Violation ;
        sh:sourceConstraintComponent sh:MinCountConstraintComponent ;
        sh:sourceShape [] ;
        sh:resultMessage "A ServiceUpdate must contain exactly one serviceInstanceId IRI."
    ] ;
    <http://example.org/validatedShape> pilots:PilotsEventShape .
 
[] a sh:ValidationReport ;
    sh:conforms true ;
    <http://example.org/validatedShape> pilots:PurchaseCertificateShape .
`
 
const expectedNoPurchaseCertificate = `
@prefix ex:     <http://example.com/> .
@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix pilots: <https://pilots-project.be/ns#> .
 
[] a sh:ValidationReport ;
    sh:conforms true ;
    <http://example.org/validatedShape> pilots:PilotsEventShape .
 
[] a sh:ValidationReport ;
    sh:conforms false ;
    sh:result [
        a sh:ValidationResult ;
        sh:focusNode ex:event ;
        sh:resultPath pilots:paymentReference ;
        sh:resultSeverity sh:Violation ;
        sh:sourceConstraintComponent sh:MinCountConstraintComponent ;
        sh:sourceShape [] ;
        sh:resultMessage "purchaseCertificate events must contain exactly one paymentReference."
    ] ;
    <http://example.org/validatedShape> pilots:PurchaseCertificateShape .
`
 
// No State of the World: no focus nodes for either shape.
// As there is no sotw:SotW node, the focus node of the results is the fallback <urn:sotw:unknown>.
const expectedNoSotw = `
@prefix sh:            <http://www.w3.org/ns/shacl#> .
@prefix pilots:        <https://pilots-project.be/ns#> .
@prefix pilotsProfile: <https://pilots-project.be/odrlProfile/> .
 
[] a sh:ValidationReport ;
    sh:conforms false ;
    sh:result [
        a sh:ValidationResult ;
        sh:focusNode <urn:sotw:unknown> ;
        sh:resultSeverity sh:Violation ;
        sh:sourceConstraintComponent pilotsProfile:FocusNodeExistenceConstraintComponent ;
        sh:sourceShape pilots:PilotsEventShape ;
        sh:resultMessage "The State of the World contains no focus node for shape <https://pilots-project.be/ns#PilotsEventShape>: at least one is required."
    ] ;
    <http://example.org/validatedShape> pilots:PilotsEventShape .
 
[] a sh:ValidationReport ;
    sh:conforms false ;
    sh:result [
        a sh:ValidationResult ;
        sh:focusNode <urn:sotw:unknown> ;
        sh:resultSeverity sh:Violation ;
        sh:sourceConstraintComponent pilotsProfile:FocusNodeExistenceConstraintComponent ;
        sh:sourceShape pilots:PurchaseCertificateShape ;
        sh:resultMessage "The State of the World contains no focus node for shape <https://pilots-project.be/ns#PurchaseCertificateShape>: at least one is required."
    ] ;
    <http://example.org/validatedShape> pilots:PurchaseCertificateShape .
`

describe('The ShapeConstraintValidator', () => {
    const validator = new ShapeConstraintValidator(new Parser().parse(shapes));
 
    it('produces a conforming report per shape for a valid State of the World.', async () => {
        const output = await validator.validate(new Parser().parse(policy), new Parser().parse(validSotw));
        expect(isomorphic(blanknodeify(output as any as Quad[]), new Parser().parse(expectedValid))).toBe(true);
    });
 
    it('reports a violation of the PilotsEventShape when the ServiceUpdate has no serviceInstanceId.', async () => {
        const output = await validator.validate(new Parser().parse(policy), new Parser().parse(sotwNoServiceUpdate));
        expect(isomorphic(blanknodeify(output as any as Quad[]), new Parser().parse(expectedNoServiceUpdate))).toBe(true);
    });
 
    it('reports a violation of the PurchaseCertificateShape when the purchaseCertificate has no paymentReference.', async () => {
        const output = await validator.validate(new Parser().parse(policy), new Parser().parse(sotwNoPurchaseCertificate));
        expect(isomorphic(blanknodeify(output as any as Quad[]), new Parser().parse(expectedNoPurchaseCertificate))).toBe(true);
    });

    it('reports that no focus node exists for either shape when there is no State of the World.', async () => {
        const output = await validator.validate(new Parser().parse(policy), []);
        expect(isomorphic(blanknodeify(output as any as Quad[]), new Parser().parse(expectedNoSotw))).toBe(true);
    });

    it('does nothing when the policy contains no shapes.', async () => {
        const output = await validator.validate(new Parser().parse(policyWithoutConstraints), []);
        expect(output).toEqual([])
    });
  
});
