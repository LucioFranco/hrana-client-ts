import { fetch } from "@libsql/isomorphic-fetch";

import type { ProtocolVersion } from "../client.js";
import { Client } from "../client.js";
import { ClosedError } from "../errors.js";

import { HttpStream } from "./stream.js";

/** A client for the Hrana protocol over HTTP. */
export class HttpClient extends Client {
    #url: URL;
    #jwt: string | null;
    #fetch: typeof fetch;
    #closed: boolean;
    #streams: Set<HttpStream>;

    /** @private */
    constructor(url: URL, jwt: string | null, customFetch: unknown | undefined) {
        super();
        this.#url = url;
        this.#jwt = jwt;
        this.#fetch = (customFetch as typeof fetch) ?? fetch;
        this.#closed = false;
        this.#streams = new Set();
    }

    /** Get the protocol version supported by the server. */
    override getVersion(): Promise<ProtocolVersion> {
        return Promise.resolve(2);
    }

    /** Open a {@link HttpStream}, a stream for executing SQL statements. */
    override openStream(): HttpStream {
        if (this.#closed) {
            throw new ClosedError("Client is closed", undefined);
        }
        const stream = new HttpStream(this, this.#url, this.#jwt, this.#fetch);
        this.#streams.add(stream);
        return stream;
    }

    /** @private */
    _streamClosed(stream: HttpStream): void {
        this.#streams.delete(stream);
    }

    /** Close the client and all its streams. */
    override close(): void {
        this.#closed = true;
        for (const stream of Array.from(this.#streams)) {
            stream._closeFromClient();
        }
    }

    /** True if the client is closed. */
    override get closed(): boolean {
        return this.#closed;
    }
}
