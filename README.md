# Pilots Use Case

Related to the [PILOTS ICON project](https://researchportal.vub.be/en/projects/icon-project-pilots-physical-internet-logistics-and-optimized-tra/): Physical Internet Logistics and Optimized Transport Systems

Builds on the publication in [IPIC 2026](https://ipic2026.pi.events/sites/default/files/downloads/IPIC2026_Proceedings.pdf): "Policy-based and Process-Aware Interoperability in the Physical Internet" (page 328 of the proceedings)
by Philippe Michiels, Julián Rojas and Birger Schrevens

In [PILOTS-service-policies](https://github.com/KNowledgeOnWebScale/PILOTS-service-policies), there exist some more example policies made by [Julián Rojas](https://github.com/julianrojas87).

## Open issues
- we don't own the domain name: https://pilots-project.be/
- What is scenario 2 exactly again
- The SHACL shape only checks the general pilots service update shape. Not whether the states actually are correct (which we could do if that is required)

## TODOs (clean up)

[FORCE ODRL profile](https://w3id.org/force/sotw/profile/)
- create and define sotw-profile:role in FORCE as a Left Operand
- create and define sotw-profile:shape in FORCE as a Left Operand

## Use Case: automated process-based access control

### High level descriptions

Using state of the art technologies and prototypes, show automated process-based usage control using dynamic roles with input validation.

- Dynamic roles are achieved using [Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) (VCs) and [Decentralized Identifiers](https://www.w3.org/TR/did-1.0/) (DIDs), both W3C Recommendations.
- Usage control policies are written using the [Open Digital Rights Language](https://www.w3.org/TR/odrl-model) (ODRL) W3C Recommendation and evaluated using the state of the art [ODRL Evaluator](https://w3id.org/force/evaluator) accompanied with vocabularies ([Evaluation Request](https://w3id.org/force/sotw), [State of the World](https://w3id.org/force/sotw) and [Compliance Report Model](https://w3id.org/force/compliance-report)) endorsed by the [ODRL CG](https://www.w3.org/community/odrl/).
- Input Validation is achieved through the use of the [Shapes Constraint Language](https://www.w3.org/TR/shacl/) (SHACL), a W3C Recommendation

DIDs and VCs could be handled through the [IdentityHub](https://github.com/eclipse-edc/IdentityHub) from the [Eclipse Dataspace Components (EDC)](https://github.com/eclipse-edc) organization.

> [!NOTE]
> The scenarios in this document are situated within the certified container weighing process described in Section 7 of the IPIC 2026 paper. The process is executed within a federated logistics dataspace in which multiple organisations participate, including *Van Moer Logistics*, *CertiWeight*, and potentially other organisations such as *De Vlaamse Waterweg*.
>
> In line with dataspace principles, each participant retains control over its own identities, data, and services. Trust between participants is established through a shared governance framework. As part of this framework, a governance authority acts as an observer (previously [clearing house](https://internationaldataspaces.org/from-clearing-house-to-observer-redefining-trust-in-data-transactions/) as defined by the IDSA) and maintains information about which participants are authorised to fulfil specific roles within a process.
>
> For the certified container weighing process, the observer recognises *Van Moer Logistics* as a participant that may consume certified weighing services and *CertiWeight* as a participant that may provide them. Based on this governance information, Van Moer may issue Verifiable Credentials asserting that one of its employees acts as a `dpv:ServiceConsumer`, while CertiWeight may issue Verifiable Credentials asserting that one of its employees acts as a `dpv:ServiceProvider`.
>
> The following scenarios demonstrate how employees prove their affiliations and process roles using Verifiable Credentials and Decentralized Identifiers, and how these claims are subsequently used during policy evaluation.

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
> The DIDs above are deliberately simplified for demonstrative purpose. Real jwk dids normally start with `did:jwk:ey...`

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

Building on the previous scenario, Alice has already demonstrated that she is affiliated with Van Moer Logistics.
In this scenario, we consider a governance authority that defines which organisational participants may act in certain process roles. 
The authority recognises Van Moer Logistics as a valid service consumer organisation and allows it to assign the role `dpv:ServiceConsumer` to its employees.

To enable Alice to act on behalf of Van Moer, Van Moer issues a Verifiable Credential stating that Alice has the role `dpv:ServiceConsumer`.
```json
{
  "issuer": "did:jwk:vanmoer",
  "credentialSubject": {
    "id": "did:jwk:alice",
    "role": "dpv:ServiceConsumer"
  }
}
```

#### Proving process role
Suppose Alice wants to demonstrate that she is authorised to act as a service consumer.

1. Alice presents the credential containing her role.
2. Alice creates a Verifiable Presentation (VP) containing the credential.
3. Alice signs the VP using the private key corresponding to `did:jwk:alice`.
4. The verifier checks:
   - the signature on the VP using Alice's DID;
   - the signature on the credential using Van Moer's DID;
   - that the credential subject (`did:jwk:alice`) matches the DID that signed the VP.
   - that the governance framework recognises Van Moer Logistics as an organisation authorised to assign the `dpv:ServiceConsumer` role.
If all checks succeed, the verifier can conclude:

> The presenter controls `did:jwk:alice`, and Van Moer Logistics asserts that this DID is authorised to act as a `dpv:ServiceConsumer`, and the governance framework authorises Van Moer Logistics to assign that role.

### Scenario 3: Evaluating access request with input validation

Building on the previous scenarios, we assume that Alice has already established her organisational affiliation and role using Verifiable Credentials and Decentralized Identifiers.

In this scenario, Alice requests access to the certificate of the weight of a container.
The access decision is among other factors based on her role (`dpv:ServiceConsumer`) and on the state of the logistics process represented by a PILOTS event.

The decision combines three inputs:

1. An **Evaluation Request** containing contextual information about Alice (the requesting party), following the model described in the [State of the World and Evaluation Request paper](https://ceur-ws.org/Vol-4093/paper5.pdf).
2. A **State of the World (SotW)** containing the relevant process event, as introduced in the same [State of the World and Evaluation Request paper](https://ceur-ws.org/Vol-4093/paper5.pdf).
3. An **ODRL Policy** describing the conditions under which access is permitted.

In addition to role-based checks, the policy requires the process event contained in the State of the World to conform to a SHACL shape. 
This validation approach builds on earlier work on semantic validation in transport and logistics systems presented at [Sem4Tra](https://ceur-ws.org/Vol-3510/paper_sem4tra_1.pdf), 
and demonstrates how process-aware access control can combine dynamic roles, process context, and input validation in a single policy evaluation.

The evaluation is performed by the [ODRL Evaluator](https://dl.acm.org/doi/10.1007/978-3-031-94578-6_11) using the Evaluation Request, State of the World, and ODRL Policy as inputs.

> [!NOTE]
> This scenario is inspired by the certified container weighing process described in Section 7 of the IPIC 2026 paper. The event used in the State of the World corresponds to the `purchaseCertificate` transition.

> [!NOTE]
> The SHACL shape used to validate process events is included in the appendix. The ODRL policy uses the custom PILOTS ODRL profile, which is also defined in the appendix. 
> Furthermore, a more specific SHACL shape is provided to validate `pilots:purchaseCertificate` events.

Evaluation Request
```ttl
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
        sotw:describesFeature pilots:actorRole . # defined in the IPIC paper
    ] .

<did:jwk:vanmoer> a odrl:PartyCollection .
<did:jwk:alice> odrl:partOf <did:jwk:vanmoer> .
```

> [!NOTE]
> The roles `dpv:ServiceProvider` and `dpv:ServiceConsumer` are reused instead of introducing `pilots:serviceProvider` and `pilots:serviceUser`, as these concepts are already defined in [DPV](http://www.w3.org/ns/dpv). </br>
> This differs a bit from the IPIC 2026 paper by Philippe Michiels, Julián Rojas and Birger Schrevens where they did introduce `pilots:serviceProvider` and `pilots:serviceUser`.


State of the World
```ttl
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
    pay:amount pay:netAmount "100.00"^^xsd:decimal ;
    pay:currency "EUR" .
```

> [!NOTE]
> The payment ontology proposed in the [force sotw](https://spec.knows.idlab.ugent.be/sotw/latest/#namespaces) does not resolve (https://reference.data.gov.uk/def/payment). This has been documented in [issue 11](https://github.com/KNowledgeOnWebScale/sotw/issues/11) of the SOTW spec.

> [!NOTE]
> Another question, when checking whether it is payed. Is it for each time we want a certificate or only once? The semantics in ODRL are not well defined and therefore we cannot evaluate this properly. See [bonatti's paper](https://ceur-ws.org/Vol-3977/OPAL2025-4.pdf) (see remark 3: pay-per-view vs once and for all behaviour) Wout's ODRL journal on formal semantics where we detail we do not know this cardinality.

ODRL Policy
```ttl
@prefix ex:      <http://example.com/> .
@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix dpv:     <https://w3id.org/dpv#>.
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pilotsProfile:  <https://pilots-project.be/odrlProfile/> .

ex:pilotsPolicy a odrl:Set; # This is an odrl:Set because the policy does not identify an assigner
    odrl:profile <https://pilots-project.be/odrlProfile/> ;
    odrl:permission ex:purchaseCertificatePermission .

ex:purchaseCertificatePermission a odrl:Permission;
    odrl:target ex:containerWeight ;
    odrl:assignee [
        a odrl:PartyCollection ;
        odrl:refinement ex:roleConstraint .
    ] ;
    odrl:action odrl:read ;
    odrl:constraint ex:eventConstraint .

ex:eventConstraint a odrl:Constraint ;
    odrl:leftOperand pilotsProfile:shape ;
    odrl:operator odrl:eq ;
    odrl:rightOperand pilots:PilotsEventShape .

ex:roleConstraint a odrl:Constraint ;
    odrl:leftOperand pilotsProfile:role ;
    odrl:operator odrl:eq ;
    odrl:rightOperand dpv:ServiceConsumer ; # similar to pilots:serviceUser .
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
- one of the claims is not present (e.g., the ServiceConsumer)

## Appendix

### Service Update SHACL Resource

> [!WARNING]
> The snippet below is copied from the [service SHACL shape](./serviceShape.ttl), so potentially outdated.


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

### Purchase Certificate SHACL Resource
The following SHACL shape ensures that `pilots:PurchaseCertificateShape` events contain as previous state `pilots:certificateCreated`, as next state `pilots:certificatePurchased` and have a `pilots:paymentReference` .

> [!WARNING]
> The snippet below is copied from the [purchase certificate SHACL shape](./purchaseCertificateShape.ttl), so potentially outdated.

```ttl
@prefix sh:      <http://www.w3.org/ns/shacl#> .
@prefix rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix pilots:  <https://pilots-project.be/ns#> .

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
```


### ODRL Pilots profile

> [!WARNING]
> The snippet below is copied from the [pilots profile](./pilotsProfile.ttl), so potentially outdated.

```ttl
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix odrl: <http://www.w3.org/ns/odrl/2/>.
@prefix owl: <http://www.w3.org/2002/07/owl#>.
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pilotsProfile:  <https://pilots-project.be/odrlProfile/> .
@prefix profile: <http://www.w3.org/ns/dx/prof/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix skos: <http://www.w3.org/2004/02/skos/core#>.
@prefix sw: <http://www.w3.org/2003/06/sw-vocab-status/ns#>.
@prefix vann: <http://purl.org/vocab/vann/>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.


# ------------ Ontology Metadata ------------------ #

<https://pilots-project.be/odrlProfile> a owl:Ontology, profile:Profile ;
    profile:isProfileOf <http://www.w3.org/ns/odrl/2/core> ;
    profile:hasResource pilotsProfile:pilotsProfile-html, pilotsProfile:pilotsProfile-ttl ;
    dcterms:title "ODRL Profile for Physical Internet Logistics and Optimized Transport Systems (PILOTS)."@en ;
    vann:preferredNamespacePrefix "pilotsProfile" ;
    vann:preferredNamespaceUri "https://pilots-project.be/odrlProfile/"^^xsd:string ;
	rdfs:label "ODRL PILOTS profile"@en ;
    owl:versionInfo "0.1"^^xsd:string ;
    dcterms:created "2026-09-09"^^xsd:date ;
	dcterms:issued "2026-09-09"^^xsd:date ;
    owl:versionIRI <https://pilots-project.be/odrlProfile/0.1> ;
    dcterms:creator <https://pod.woutslabbinck.com/profile/card#me>, <https://julianrojas.org/#me> ;
	dcterms:publisher <https://pod.woutslabbinck.com/profile/card#me> ; 
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
	dcterms:license <http://purl.org/NET/rdflicense/cc-by4.0> ; 
    sw:term_status "testing"@en.

pilotsProfile:pilotsProfile-html a profile:ResourceDescriptor ;
    profile:hasRole pilotsProfile:specification ;
    profile:hasArtifact <https://pilots-project.be/pilotsProfile.html> ;
    dcterms:title "ODRL Profile for Physical Internet Logistics and Optimized Transport Systems (PILOTS) HTML specification"@en ;
    dcterms:format <https://www.iana.org/assignments/media-types/text/html> ;
    dcterms:conformsTo <https://www.w3.org/TR/html/> .

pilotsProfile:pilotsProfile-ttl a profile:ResourceDescriptor ;
    profile:hasRole pilotsProfile:vocabulary ;
    profile:hasArtifact <https://pilots-project.be/pilotsProfile.ttl> ;
    dcterms:title "ODRL Profile for Physical Internet Logistics and Optimized Transport Systems (PILOTS) Turtle vocabulary"@en ;
    dcterms:format <https://www.iana.org/assignments/media-types/text/turtle> ;
    dcterms:conformsTo <https://www.w3.org/TR/turtle/> .

pilotsProfile:Concepts a skos:Collection ;
    skos:prefLabel "ODRL PILOTS profile concepts"@en ;
    skos:member pilotsProfile:shape ;
    skos:member pilotsProfile:role .
    # if any, used left operands from ODRL 2.2 need to be also added here.

# ------------ Left Operand Concepts ------------------ #

pilotsProfile:shape a odrl:LeftOperand, owl:NamedIndividual, skos:Concept ;
    rdfs:isDefinedBy pilotsProfile: ;
    rdfs:label "Shape"@en ;
    rdfs:comment "Evaluates whether the event contained in the State of the World conforms to the SHACL shape identified by the right operand."@en ;
    skos:definition "A left operand whose value is derived by validating the sole event referenced from the State of the World against the SHACL shape specified as the right operand."@en ;
    skos:note "The evaluator expects exactly one event to be present in the State of the World. Only odrl:eq SHOULD be used as odrl:Operator. As odrl:RightOperand, the allowed value is an IRI which corresponds to a SHACL shape (of class sh:NodeShape)."@en ;
    skos:example '''
        <https://example.com/shapeConstraint1> a odrl:Constraint ;
        odrl:leftOperand pilotsProfile:shape ;
        odrl:operator odrl:eq ;
        odrl:rightOperand <https://example.com/shape> .

        # Then somewhere there must be the following shape must exist
        <https://example.com/shape> a <http://www.w3.org/ns/shacl#NodeShape> .
    '''.
pilotsProfile:role a odrl:LeftOperand, owl:NamedIndividual, skos:Concept ;
    rdfs:isDefinedBy pilotsProfile: ;
    rdfs:label "Role"@en ;
    rdfs:comment "Evaluates a role supplied as contextual information to the policy evaluation process."@en ;
    skos:definition "A left operand whose value is obtained from contextual attributes provided to the evaluation request and compared against the role identified by the right operand."@en ;
    skos:note "Only odrl:eq SHOULD be used as odrl:Operator. Furthermore, the allowed odrl:RightOperand s are exclusively dpv:ServiceProvider and dpv:ServiceConsumer."@en ;
    skos:example '''
        <https://example.com/roleConstraint1> a odrl:Constraint ;
        odrl:leftOperand pilotsProfile:role ;
        odrl:operator odrl:eq ;
        odrl:rightOperand dpv:ServiceConsumer .
    ''',
    '''
        <https://example.com/roleConstraint2> a odrl:Constraint ;
        odrl:leftOperand pilotsProfile:role ;
        odrl:operator odrl:eq ;
        odrl:rightOperand dpv:ServiceProvider .
    ''' .
```