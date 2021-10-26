// These two eslint lines are needed to store 'this' in a variable so it can be used
// in the PassThrough of trackAvailableSpace
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable consistent-this */
import { PassThrough } from 'stream';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { PayloadHttpError } from '../../util/errors/PayloadHttpError';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { RDF, PIM } from '../../util/Vocabularies';
import type { DataAccessor } from '../accessors/DataAccessor';
import type { Size } from '../size-reporter/Size';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import type { QuotaStrategy } from './QuotaStrategy';

/**
 * The GlobalQuotaStrategy sets a limit on the amount of data stored on the server globally
 */
export class PodQuotaStrategy implements QuotaStrategy {
  public readonly limit: Size;
  private readonly reporter: SizeReporter;
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly accessor: DataAccessor;

  public constructor(
    limit: Size,
    reporter: SizeReporter,
    identifierStrategy: IdentifierStrategy,
    accessor: DataAccessor,
  ) {
    this.limit = limit;
    this.reporter = reporter;
    this.identifierStrategy = identifierStrategy;
    this.accessor = accessor;
  }

  public async getAvailableSpace(identifier: ResourceIdentifier): Promise<Size> {
    const pimStorage = await this.searchPimStorage(identifier);

    // There is no pod above this resource so it is assumed this is an identifier
    // that points to somewhere in the root outside an actual pod.
    // No quota apply here ( people do not have access to write here ).
    // The lack of enforced quota in the root makes sure pod can be created freely.
    if (!pimStorage) {
      return { amount: Number.MAX_SAFE_INTEGER, unit: this.limit.unit };
    }

    let used = (await this.reporter.getSize(pimStorage)).amount;
    // When a file is overwritten the space the file takes up right now should also
    // be counted as available space as it will disappear/be overwritten
    used -= (await this.reporter.getSize(identifier)).amount;

    return { amount: this.limit.amount - used, unit: this.limit.unit };
  }

  /** Finds the closest parent container that has pim:storage as metadata */
  private async searchPimStorage(identifier: ResourceIdentifier): Promise<ResourceIdentifier | undefined> {
    let parent;

    try {
      parent = this.identifierStrategy.getParentContainer(identifier);
    } catch {
      return undefined;
    }

    const parentMetadata = await this.accessor.getMetadata(parent);
    const hasPimStorageMetadata = parentMetadata.getAll(RDF.type)
      .some((term): boolean => term.value === PIM.Storage);

    return hasPimStorageMetadata ? parent : this.searchPimStorage(parent);
  }

  /** The estimated size of a resource in this strategy is simply the content-length header */
  public async estimateSize(metadata: RepresentationMetadata): Promise<Size> {
    return {
      amount: metadata.contentLength ?? 0,
      unit: this.limit.unit,
    };
  }

  public async trackAvailableSpace(identifier: ResourceIdentifier): Promise<Guarded<PassThrough>> {
    let total = 0;
    const strategy = this;
    const { reporter } = this;

    return guardStream(new PassThrough({
      async transform(this, chunk: any, enc: string, done: () => void): Promise<void> {
        total += await reporter.calculateChunkSize(chunk);
        const availableSpace = await strategy.getAvailableSpace(identifier);
        if (availableSpace.amount < total) {
          this.destroy(new PayloadHttpError(
            `Quota exceeded by ${total - availableSpace.amount} ${availableSpace.unit} during write`,
          ));
        }

        this.push(chunk);
        done();
      },
    }));
  }
}
