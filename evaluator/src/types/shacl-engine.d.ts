// Minimal typings for shacl-engine (the package ships without TypeScript declarations).
declare module 'shacl-engine' {
    import type { DatasetCore, Quad, Term } from '@rdfjs/types';

    export interface ValidationReport {
        conforms: boolean;
        term: Term;
        dataset: Iterable<Quad>;
    }

    export class Validator {
        constructor(shapes: DatasetCore<Quad>, options: { factory: unknown, [option: string]: unknown });
        /** Validates the data graph; when `shapes` is given, only against those shapes. */
        validate(data: { dataset: DatasetCore<Quad>, terms?: Term[] }, shapes?: { terms: Term[] }[]): Promise<ValidationReport>;
    }
}
