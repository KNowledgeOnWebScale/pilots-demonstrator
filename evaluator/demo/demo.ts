import { PilotsODRLEvaluator, prefixes, PILOT_SHAPES } from '../src'
import { Parser } from 'n3'
import * as fs from 'fs';
import * as path from 'path';
import { write } from '@jeswr/pretty-turtle';

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
    odrl:rightOperand pilots:PurchaseCertificateShape .`

const request = `
@prefix ex:      <http://example.com/> .
@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix dpv:     <https://w3id.org/dpv#>.
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .
@prefix pilots:  <https://pilots-project.be/ns#> .

ex:request a sotw:EvaluationRequest ;
    sotw:evaluatedParty <did:jwk:alice> ;
    sotw:evaluatedAction odrl:read ;
    sotw:evaluatedTarget ex:containerWeight ;
    sotw:requestParameter [
        a sotw:RequestParameter ;
        sotw:value "2025-11-24T11:44:22"^^xsd:dateTime ;
        sotw:describesFeature sotw:TemporalData ;
    ], [
        a sotw:RequestParameter ;
        sotw:value dpv:ServiceConsumer ; # similar to pilots:serviceUser
        sotw:describesFeature pilots:actorRole ; # defined in the IPIC paper
    ] .

<did:jwk:vanmoer> a odrl:PartyCollection .
<did:jwk:alice> odrl:partOf <did:jwk:vanmoer> .
`

const sotw = `
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
    dct:issued "2025-11-24T11:44:22"^^xsd:dateTime . # NOTE: must this match the time of the request time?

ex:payment a pay:Payment ;
    pay:payer <did:jwk:vanmoer> ;
    pay:payee <did:jwk:certiweight> ;
    pay:transactionId "paymentTransactionID" ;
    pay:paymentDate "2025-11-23T11:30:00"^^xsd:dateTime ; # NOTE: clearly before the request time
    pay:netAmount "100.00"^^xsd:decimal ;
    pay:currency "EUR" .
`



async function main(){
    const parser = new Parser()
    const evaluator = new PilotsODRLEvaluator({shapes: parser.parse(PILOT_SHAPES)})

    const policyQuads = parser.parse(policy);
    const requestQuads = parser.parse(request);
    const sotwQuads = parser.parse(sotw);
    const evaluation = await evaluator.evaluate(policyQuads, requestQuads, sotwQuads)

    const serialization = await write(evaluation, {prefixes})
    console.log(serialization);
}
main()