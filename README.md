# Pilots Use Case

Related to the [PILOTS ICON project](https://researchportal.vub.be/en/projects/icon-project-pilots-physical-internet-logistics-and-optimized-tra/): Physical Internet Logistics and Optimized Transport Systems

Builds on the publication in [IPIC 2026](https://ipic2026.pi.events/sites/default/files/downloads/IPIC2026_Proceedings.pdf): "Policy-based and Process-Aware Interoperability in the Physical Internet" (page 328 of the proceedings)
by Philippe Michiels, Julián Rojas and Birger Schrevens

## Open issues
- we don't own the domain name: https://pilots-project.be/
- What is scenario 2 exactly again
- Does this make sense? I think this is important before I make the webpage
- The SHACL shape only checks the general pilots service update shape. Not whether the states actually are correct (which we could do if that is required)

## Use Case: automated process-based access control

### High level descriptions

Using state of the art technologies and prototypes, show automated process-based usage control using dynamic roles with input validation.

- Dynamic roles are achieved using [Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) (VCs) and [Decentralized Identifiers](https://www.w3.org/TR/did-1.0/) (DIDs), both W3C Recommendations.
- Usage control policies are written using the [Open Digital Rights Language](https://www.w3.org/TR/odrl-model) (ODRL) W3C Recommendation and evaluated using the state of the art [ODRL Evaluator](https://w3id.org/force/evaluator) accompagnied with vocabularies ([Evaluation Request](https://w3id.org/force/sotw), [State of the World](https://w3id.org/force/sotw) and [Compliance Report Model](https://w3id.org/force/compliance-report)) endorsed by the [ODRL CG](https://www.w3.org/community/odrl/).
- Input Validation is achieved through the use of the [Shapes Constraint Language](https://www.w3.org/TR/shacl/) (SHACL), a W3C Recommendation

### Scenario 1: Establishing organisational identity

In PILOTS, independent participants collaborate in a federated ecosystem.
In this scenario, we consider two participants: *Van Moer Logistics* and *CertiWeight*.
We use Verifiable Credentials (VCs) and Decentralized Identifiers (DIDs) to demonstrate how Alice can prove that she works for Van Moer Logistics and how Bob can prove that he works for CertiWeight.
Using the aforementioned technologies, there is no need for a central identity provider to establish trust in the affiliation claims.

- Van Moer Logistics DID: `did:jwk:vanmoer`
- CertiWeight DID: `did:jwk:certiweight`
- Alice DID: `did:jwk:alice`
- Bob DID: `did:jwk:bob`

> [!NOTE]
> The dids above are deliberatily simplified for demonstrative purpose. Real jwk dids normally start with `did:jwk:ey...`

Van Moer issues a credential to Alice:
```json
{
  "issuer": "did:jwk:vanmoer",
  "credentialSubject": {
    "id": "did:jwk:alice",
    "memberOf": "Van Moer Logistics"
  }
}
```
CertiWeight issues a Verifiable Credential to Bob:
```json
{
  "issuer": "did:jwk:certiweight",
  "credentialSubject": {
    "id": "did:jwk:bob",
    "memberOf": "CertiWeight"
  }
}
```

#### Proving organisational affiliation

Suppose Alice wants to prove to Bob that she works for Van Moer Logistics.

1. Alice presents the credential issued by Van Moer.
2. Alice creates a Verifiable Presentation (VP) containing the credential.
3. Alice signs the VP using the private key corresponding to `did:jwk:alice`.
4. Bob verifies:
   - the signature on the VP using Alice's DID;
   - the signature on the credential using Van Moer's DID;
   - that the credential subject (`did:jwk:alice`) matches the DID that signed the VP.

If all checks succeed, Bob can conclude:

> The presenter controls `did:jwk:alice`, and Van Moer Logistics asserts that this DID belongs to a member of Van Moer Logistics.

The same process can be used by Bob to prove to Alice that he works for CertiWeight.

### Scenario 2: Establishing the role within a process

TODO: verify with Julian whether that makes sense

Or is this achieved with the description of Scenario 1?

NOTE: should scenario 2 ensure that we get the `pilots:serviceUser` role?

### Scenario 3: Evaluating access request with Input Validation

Building on the previous scenarios, we assume that Alice has already established her organisational affiliation and role using Verifiable Credentials and Decentralized Identifiers.

In this scenario, Alice requests access to the certificate of the weight of a container.
The access decision is amongst others based on her role (`pilots:serviceUser`) and on the state of the logistics process represented by a PILOTS event.

The decision combines three inputs:

1. An **Evaluation Request** containing contextual information about Alice (the requesting party).
2. A **State of the World (SotW)** containing the relevant process event.
3. An **ODRL Policy** describing the conditions under which access is permitted.

In addition to role-based checks, the policy requires the process event contained in the State of the World to conform to a SHACL shape. This demonstrates how process-aware access control can combine dynamic roles, process context, and input validation in a single policy evaluation.

The evaluation is performed by the ODRL Evaluator using the Evaluation Request, State of the World, and ODRL Policy as inputs.

> [!NOTE]
> This scenario is inspired by the certified container weighing process described in Section 7 of the IPIC 2026 paper. The event used in the State of the World corresponds to the `purchaseCertificate` transition.

> [!NOTE]
> The SHACL shape used to validate process events is included in the appendix. The ODRL policy uses the custom PILOTS ODRL profile, which is also defined in the appendix. 

Evaluation Request
```ttl
@prefix ex:      <http://example.com/> .
@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix org:     <http://www.w3.org/ns/org#> . # The Organization Ontology: W3C recommendation to publish cross-organizational information

ex:request a sotw:EvaluationRequest ;
    sotw:evaluatedParty <did:jwk:alice> ;
    sotw:evaluatedAction odrl:read ;
    sotw:evaluatedTarget ex:containerWeight ;
    sotw:requestParameter [
        a sotw:RequestParameter ;
        sotw:value "2025-11-24T11:44.22"^^xsd:dateTime ;
        sotw:describesFeature sotw:TemporalData ;
    ], [
        a sotw:RequestParameter ;
        sotw:value pilots:serviceUser ;
        sotw:describesFeature pilots:Role .
    ], [
        a sotw:RequestParameter ;
        sotw:value <did:jwk:vanmoer> ;
        sotw:describesFeature org:memberOf .
    ] .
```

State of the World
```ttl
@prefix ex:      <http://example.com/> .
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix dct:     <http://purl.org/dc/terms/>.
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .

ex:sotw a sotw:SotW ;
    sotw:context ex:event .

ex:event a pilots:ServiceUpdate, pilots:purchaseCertificate ;
    pilots:serviceDefinitionId pilots:WeighingServiceDescription; 
    pilots:serviceInstanceId <urn:uuid:3977d047-322c-4fa9-8f23-7074aa154284> ; # TODO: what does this ID mean?
    pilots:previousState pilots:certificateCreated ;
    pilots:newState pilots:certificatePurchased ;
    dct:issued "2025-11-24T11:44.22"^^xsd:dateTime . # NOTE: must this match the time of the request time?
```

ODRL Policy
```ttl
@prefix ex:      <http://example.com/> .
@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pilotsProfile:  <https://pilots-project.be/odrlProfile/> .

ex:pilotsPolicy a odrl:Set; # Can't be agreement cause we do not have an assigner and assignee
    odrl:profile <https://pilots-project.be/odrlProfile/> ;
    odrl:permission ex:purchaseCertificatePermission .

ex:purchaseCertificatePermission a odrl:Permission;
    odrl:target ex:containerWeight ;
    odrl:action odrl:read ;
    odrl:constraint ex:eventConstraint, ex:roleConstraint .

ex:eventConstraint a odrl:Constraint ;
    odrl:leftOperand pilotsProfile:shape ;
    odrl:operator odrl:eq ;
    odrl:rightOperand pilots:PilotsEventShape .

ex:roleConstraint a odrl:constraint ;
    odrl:leftOperand pilotsProfile:role ;
    odrl:operator odrl:eq ;
    odrl:rightOperand pilots:serviceUser .
```


## Demonstrator
TODO:

A single page website that demonstrates all parts individually

### First part: verifies VPs from Alice and Bob regarding their affiliations

### Second part: Don't really know

### Third part: Does the evaluation with the implemented ODRL Evaluator

- As input, the sotw, request and policy are preloaded (mainly the happy story)
- dropdown menus are provided with "wrong" input that will ensure the access request fails
- Influence for this is the [force demo](https://w3id.org/force/demo)

We'll be able to show multiple aspects
- everything works
- event is not complete/there is no event
- one of the claims is not present (e.g. the serviceUser)

## Appendix

### Service Update SHACL Resource

The following SHACL shape ensures that every `pilots:ServiceUpdate` contains exactly one service definition, service instance, previous state, new state, and issuance timestamp. 

The first four properties must be IRIs and the timestamp must be an `xsd:dateTime`.
```
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
```

### ODRL Pilots profile

```ttl
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix odrl: <http://www.w3.org/ns/odrl/2/>.
@prefix owl: <http://www.w3.org/2002/07/owl#>.
@prefix pilots:  <https://pilots-project.be/> .
@prefix pilotsProfile:  <https://pilots-project.be/odrlProfile/> .
@prefix profile: <http://www.w3.org/ns/dx/prof/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix skos: <http://www.w3.org/2004/02/skos/core#>.
@prefix vann: <http://purl.org/vocab/vann/>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.


# ------------ Ontology Metadata ------------------ #

<https://pilots-project.be/odrlProfile/> a owl:Ontology, profile:Profile ;
    profile:isProfileOf <http://www.w3.org/ns/odrl/2/core> ;
    dcterms:title "ODRL Profile for Physical Internet Logistics and Optimized Transport Systems (PILOTS)."@en ;
    vann:preferredNamespacePrefix "pilotsProfile" ;
    vann:preferredNamespaceUri "https://pilots-project.be/odrlProfile/#"^^xsd:string ;
	rdfs:label "ODRL PILOTS profile"@en ;
    owl:versionInfo "0.1"^^xsd:string ;
    dcterms:created "2026-09-09"^^xsd:date ;
	dcterms:modified "2026-09-09"^^xsd:date ;
	dcterms:issued "2026-09-09"^^xsd:date ;
    owl:versionIRI <https://pilots-project.be/odrlProfile/0.1> ;
	owl:priorVersion <https://pilots-project.be/odrlProfile/0.1> ;
    dcterms:creator "Wout Slabbinck", "Julián Rojas" ;
	dcterms:publisher "Wout Slabbinck" ;
    dcterms:abstract """
    An ODRL profile for policy-governed process interoperability in federated
    logistics environments. The profile introduces concepts that enable policy
    evaluation over process events and contextual attributes exchanged between
    participants during process execution.
    """@en ;
    dcterms:description """
    This profile extends ODRL with concepts for evaluating process-oriented
    information used in the PILOTS interoperability model. The concepts support
    reasoning over process events represented in a State of the World and over
    contextual attributes supplied during policy evaluation, enabling validation
    of process execution and participant authorisation.
    """@en ;
	rdfs:comment "This is the RDF ontology for the ODRL Profile for Physical Internet Logistics and Optimized Transport Systems (PILOTS)."@en ;
	dcterms:source <http://www.w3.org/ns/odrl/2/> ;
	dcterms:license <https://dalicc.net/licenselibrary/CC-BY-4.0> .


<https://pilots-project.be/odrlProfile/#> a skos:Collection ;
    skos:prefLabel "ODRL PILOTS profile concepts"@en ;
    skos:member pilotsProfile:shape ;
    skos:member pilotsProfile:role .


# ------------ Left Operand Concepts ------------------ #

pilotsProfile:shape a odrl:LeftOperand, owl:NamedIndividual, skos:Concept ;
    rdfs:label "Shape"@en ;
    rdfs:comment "Evaluates whether the event contained in the State of the World conforms to the SHACL shape identified by the right operand."@en ;
    skos:definition "A left operand whose value is derived by validating the sole event referenced from the State of the World against the SHACL shape specified as the right operand."@en ;
    skos:note "The evaluator expects exactly one event to be present in the State of the World. Only odrl:eq SHOULD be used."@en .

pilotsProfile:role a odrl:LeftOperand, owl:NamedIndividual, skos:Concept ;
    rdfs:label "Role"@en ;
    rdfs:comment "Evaluates a role supplied as contextual information to the policy evaluation process."@en ;
    skos:definition "A left operand whose value is obtained from contextual attributes provided to the evaluation request and compared against the role identified by the right operand."@en ;
    skos:note "Only odrl:eq SHOULD be used."@en .
```

