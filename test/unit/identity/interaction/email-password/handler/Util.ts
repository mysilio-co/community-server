import { stringify } from 'querystring';
import type { Operation } from '../../../../../../src/ldp/operations/Operation';
import { BasicRepresentation } from '../../../../../../src/ldp/representation/BasicRepresentation';

/**
 * Creates a mock HttpRequest which is a stream of an object encoded as application/x-www-form-urlencoded
 * and a matching content-type header.
 * @param data - Object to encode.
 * @param url - URL value of the request.
 */
export function createPostFormOperation(data: NodeJS.Dict<any>, url?: string): Operation {
  return {
    method: 'POST',
    preferences: {},
    target: { path: url ?? 'http://test.com/' },
    body: new BasicRepresentation(stringify(data), 'application/x-www-form-urlencoded'),
  };
}