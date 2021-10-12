import type { Readable } from 'stream';
import type { Validator } from '../../ldp/auxiliary/Validator';
import type { Representation } from '../../ldp/representation/Representation';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { AtomicDataAccessor } from './AtomicDataAccessor';
import type { DataAccessor } from './DataAccessor';

/**
 * A ValidatingDataAccessor wraps an AtomicDataAccessor such that,
 * while writing a document, validation is performed before writing the data.
 */
export class ValidatingDataAccessor implements DataAccessor {
  private readonly accessor: AtomicDataAccessor;
  private readonly validator: Validator<any, Guarded<Readable>>;

  public constructor(accessor: DataAccessor, validator: Validator<any, Guarded<Readable>>) {
    this.accessor = accessor;
    this.validator = validator;
  }

  public async writeDocument(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ): Promise<void> {
    const pipedData = await this.validator.handle({ identifier, data, metadata });
    return this.accessor.writeDocument(identifier, pipedData, metadata);
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    // - TODO what do we do here ?
    return this.accessor.writeContainer(identifier, metadata);
  }

  public async canHandle(representation: Representation): Promise<void> {
    return this.accessor.canHandle(representation);
  }

  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    return this.accessor.getData(identifier);
  }

  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    return this.accessor.getMetadata(identifier);
  }

  public getChildren(identifier: ResourceIdentifier): AsyncIterableIterator<RepresentationMetadata> {
    return this.accessor.getChildren(identifier);
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    return this.accessor.deleteResource(identifier);
  }
}