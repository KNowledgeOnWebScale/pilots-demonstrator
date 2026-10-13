import { Parser } from 'n3';
import { ActivationState, parseSingleComplianceReport } from 'odrl-evaluator';
import { describe, expect, it } from 'vitest';
import { PilotsODRLEvaluator } from '../src/PilotsEvaluator';

const policy = `
@prefix ex:      <http://example.com/> .
@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix dpv:     <https://w3id.org/dpv#> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pilotsProfile:  <https://pilots-project.be/odrlProfile/> .

ex:pilotsPolicy a odrl:Set ; # odrl:Set because the policy does not identify an assigner
    odrl:profile <https://pilots-project.be/odrlProfile/> ;
    odrl:permission ex:purchaseCertificatePermission .

ex:purchaseCertificatePermission a odrl:Permission ;
    odrl:target ex:containerWeight ;
    odrl:assignee [
        a odrl:PartyCollection ;
        odrl:refinement ex:roleConstraint ;
    ] ;
    odrl:action odrl:read .

ex:roleConstraint a odrl:Constraint ;
    odrl:leftOperand pilotsProfile:role ;
    odrl:operator odrl:eq ;
    odrl:rightOperand dpv:ServiceConsumer . # similar to pilots:serviceUser
`

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

const requestSimple = `
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
    ] .
`

const requestDifferentRole = `
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
    ] , [
        a sotw:RequestParameter ;
        sotw:value ex:role ; # similar to pilots:serviceUser
        sotw:describesFeature pilots:actorRole ; # defined in the IPIC paper
    ] .
`
const sotw = `
@prefix ex:      <http://example.com/> .
@prefix sotw:    <https://w3id.org/force/sotw#> .

ex:sotw a sotw:SotW .
`

describe('The PilotsODRLEvaluator ', () => {
    const parser = new Parser()
    // const evaluator = new PilotsODRLEvaluator({shapes:parser.parse(PILOT_SHAPES)}) // Don't need shapes here
    const evaluator = new PilotsODRLEvaluator()
 
    it('produces a compliance report that is active when the actor role is passed in the evaluation request.', async () => {
        const policyQuads = parser.parse(policy);
        const requestQuads = parser.parse(request);
        const sotwQuads = parser.parse(sotw);
        const evaluation = await evaluator.evaluate(policyQuads, requestQuads, sotwQuads)

        const parsedReport = parseSingleComplianceReport(evaluation)
        expect(parsedReport.ruleReport[0].activationState).toEqual(ActivationState.Active);
        expect(parsedReport.ruleReport[0].premiseReport.length).toBe(3);
    });

    it('produces a compliance report that is inactive when the actor role is not present in the evaluation request.', async () => {
        const policyQuads = parser.parse(policy);
        const requestQuads = parser.parse(requestSimple);
        const sotwQuads = parser.parse(sotw);
        const evaluation = await evaluator.evaluate(policyQuads, requestQuads, sotwQuads)

        const parsedReport = parseSingleComplianceReport(evaluation)
        expect(parsedReport.ruleReport[0].activationState).toEqual(ActivationState.Inactive);
        expect(parsedReport.ruleReport[0].premiseReport.length).toBe(3);
    });

    it('produces a compliance report that is inactive when the actor role is not equal to the expected.', async () => {
        const policyQuads = parser.parse(policy);
        const requestQuads = parser.parse(requestDifferentRole);
        const sotwQuads = parser.parse(sotw);
        const evaluation = await evaluator.evaluate(policyQuads, requestQuads, sotwQuads)

        const parsedReport = parseSingleComplianceReport(evaluation)
        expect(parsedReport.ruleReport[0].activationState).toEqual(ActivationState.Inactive);
        expect(parsedReport.ruleReport[0].premiseReport.length).toBe(3);
    });
});