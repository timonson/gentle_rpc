class BadServerDataError extends Error {
    constructor(message, errorCode, data){
        super(message);
        this.name = this.constructor.name;
        this.code = errorCode;
        this.data = data;
    }
}
function validateRpcBasis(data1) {
    return data1?.jsonrpc === "2.0" && (typeof data1?.id === "number" || typeof data1?.id === "string" || data1?.id === null);
}
function validateRpcSuccess(data1) {
    return "result" in data1;
}
function validateRpcFailure(data1) {
    return typeof data1?.error?.code === "number" && typeof data1?.error?.message === "string";
}
function validateResponse(data1) {
    if (validateRpcBasis(data1)) {
        if (validateRpcSuccess(data1)) return data1;
        else if (validateRpcFailure(data1)) {
            throw new BadServerDataError(data1.error.message, data1.error.code, data1.error.data);
        }
    }
    throw new BadServerDataError("Received data is no RPC response object.", -32003);
}
function send(resource, fetchInit) {
    return fetch(resource instanceof URL ? resource.href : resource, fetchInit).then((res)=>{
        if (!res.ok) {
            return Promise.reject(new BadServerDataError(`${res.status} '${res.statusText}' received instead of 200-299 range.`, -32002));
        } else if (res.status === 204 || res.headers.get("content-length") === "0") {
            return undefined;
        } else return res.json();
    }).catch((err)=>Promise.reject(new BadServerDataError(err.message, -32001))
    );
}
function bytesToUuid(bytes) {
    const bits = [
        ...bytes
    ].map((bit)=>{
        const s = bit.toString(16);
        return bit < 16 ? "0" + s : s;
    });
    return [
        ...bits.slice(0, 4),
        "-",
        ...bits.slice(4, 6),
        "-",
        ...bits.slice(6, 8),
        "-",
        ...bits.slice(8, 10),
        "-",
        ...bits.slice(10, 16), 
    ].join("");
}
const UUID_RE = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "i");
function generate() {
    const rnds = crypto.getRandomValues(new Uint8Array(16));
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    return bytesToUuid(rnds);
}
function createRequest({ method , params , isNotification =false , id  }) {
    const rpcRequest = {
        jsonrpc: "2.0",
        method
    };
    params && (rpcRequest.params = params);
    id = isNotification ? undefined : id !== undefined ? id : generate();
    id !== undefined && (rpcRequest.id = id);
    return rpcRequest;
}
function createRequestBatch(batchObj, isNotification = false) {
    return Array.isArray(batchObj) ? batchObj.map((el, _, array)=>createRequest({
            method: array[0],
            params: el,
            isNotification
        })
    ).slice(1) : Object.entries(batchObj).map(([key, value])=>createRequest({
            method: value[0],
            params: value[1],
            isNotification,
            id: key
        })
    );
}
function processBatchArray(rpcResponseBatch) {
    return rpcResponseBatch.map((rpcResponse)=>validateResponse(rpcResponse).result
    );
}
function processBatchObject(rpcResponseBatch) {
    return rpcResponseBatch.reduce((acc, rpcResponse)=>{
        acc[rpcResponse.id] = validateResponse(rpcResponse).result;
        return acc;
    }, {
    });
}
class Client {
    constructor(resource, options = {
    }){
        const headers = options.headers === undefined ? new Headers() : options.headers instanceof Headers ? options.headers : new Headers(Object.entries(options.headers));
        headers.set("Content-Type", "application/json");
        this.fetchInit = {
            ...options,
            method: "POST",
            headers
        };
        this.resource = resource;
    }
    async batch(batchObj, isNotification) {
        const rpcResponseBatch = await send(this.resource, {
            ...this.fetchInit,
            body: JSON.stringify(createRequestBatch(batchObj, isNotification))
        });
        try {
            if (rpcResponseBatch === undefined) {
                return rpcResponseBatch;
            } else if (Array.isArray(rpcResponseBatch)) {
                return Array.isArray(batchObj) ? processBatchArray(rpcResponseBatch) : processBatchObject(rpcResponseBatch);
            } else {
                throw new BadServerDataError("The server returned an invalid batch response.", -32004);
            }
        } catch (err) {
            return Promise.reject(err);
        }
    }
    async call(method, params, { isNotification , jwt  } = {
    }) {
        const rpcRequestObj = createRequest({
            method,
            params,
            isNotification
        });
        if (jwt && this.fetchInit.headers instanceof Headers) {
            this.fetchInit.headers.set("Authorization", `Bearer ${jwt}`);
        }
        const rpcResponsePromise = send(this.resource, {
            ...this.fetchInit,
            body: JSON.stringify(rpcRequestObj)
        });
        if (jwt && this.fetchInit.headers instanceof Headers) {
            this.fetchInit.headers.delete("Authorization");
        }
        const rpcResponse = await rpcResponsePromise;
        try {
            return rpcResponse === undefined ? undefined : validateResponse(rpcResponse).result;
        } catch (err) {
            return Promise.reject(err);
        }
    }
}
function isObject(obj) {
    return obj !== null && typeof obj === "object" && Array.isArray(obj) === false;
}
class Client1 {
    constructor(socket1){
        this.socket = socket1;
        this.getPayloadData(socket1);
    }
    async getPayloadData(socket) {
        this.payloadData = new Promise((resolve, reject)=>{
            socket.onmessage = (event)=>{
                resolve(event.data);
            };
            socket.onclose = ()=>resolve(null)
            ;
        });
        await this.payloadData;
        if (socket.readyState > 1) return this.payloadData;
        return this.getPayloadData(socket);
    }
    async *iterateOverPayloadData(rpcRequest) {
        while(this.socket.readyState < 2){
            try {
                const payloadData = await this.payloadData;
                if (payloadData === null) {
                    break;
                }
                const parsedData = JSON.parse(payloadData);
                const rpcResponse = Array.isArray(parsedData) && parsedData.length > 0 ? parsedData.map(validateResponse) : validateResponse(parsedData);
                if (Array.isArray(rpcResponse)) {
                    continue;
                } else {
                    if (isObject(rpcResponse.result) && rpcResponse.result.id === rpcRequest.id) {
                        if (rpcResponse.result.event === "subscribed" || rpcResponse.result.event === "emitted") {
                            continue;
                        }
                        if (rpcResponse.result.event === "unsubscribed") {
                            break;
                        }
                    }
                    if (rpcResponse.id === rpcRequest.id) {
                        yield rpcResponse.result;
                    }
                }
            } catch (err) {
                yield Promise.reject(err instanceof BadServerDataError ? err : new BadServerDataError(err.message, -32001));
            }
        }
    }
    call(method, params, isNotification = false) {
        const rpcRequest = createRequest({
            method,
            params,
            isNotification
        });
        this.socket.send(JSON.stringify(rpcRequest));
        return {
            generator: this.iterateOverPayloadData(rpcRequest),
            send: (params)=>{
                return this.socket.send(JSON.stringify({
                    ...rpcRequest,
                    params
                }));
            }
        };
    }
    subscribe(method) {
        const rpcRequest = createRequest({
            method: "subscribe",
            params: {
                method
            }
        });
        this.socket.send(JSON.stringify(rpcRequest));
        return {
            generator: this.iterateOverPayloadData(rpcRequest),
            unsubscribe: (params)=>{
                const rpcRequestUnsubscription = createRequest({
                    method: "unsubscribe",
                    params: {
                        method,
                        id: rpcRequest.id
                    }
                });
                return this.socket.send(JSON.stringify(rpcRequestUnsubscription));
            },
            emit: (params)=>{
                return this.socket.send(JSON.stringify({
                    ...rpcRequest,
                    method: "emit",
                    params: {
                        method,
                        params,
                        id: rpcRequest.id
                    }
                }));
            },
            emitBatch: (params)=>{
                return this.socket.send(JSON.stringify(params.map((p)=>({
                        ...rpcRequest,
                        method: "emit",
                        params: {
                            method,
                            params: p,
                            id: rpcRequest.id
                        }
                    })
                )));
            }
        };
    }
}
const httpProxyHandler = {
    get (client, name) {
        if (client[name] !== undefined) {
            return client[name];
        } else {
            const proxyFunction = (args)=>client.call(name, args)
            ;
            proxyFunction.notify = (args)=>client.call(name, args, {
                    isNotification: true
                })
            ;
            proxyFunction.auth = (jwt)=>(args)=>client.call(name, args, {
                        jwt
                    })
            ;
            proxyFunction.batch = (args, isNotification = false)=>client.batch([
                    name,
                    ...args
                ], isNotification)
            ;
            return proxyFunction;
        }
    }
};
const wsProxyHandler = {
    get (client, name) {
        if (client[name] !== undefined || name === "then") {
            return client[name];
        } else {
            const proxyFunction = (args)=>client.call(name, args)
            ;
            proxyFunction.notify = (args)=>client.call(name, args, true)
            ;
            proxyFunction.subscribe = ()=>client.subscribe(name)
            ;
            return proxyFunction;
        }
    }
};
function listen(socket2) {
    return new Promise((resolve, reject)=>{
        socket2.onopen = ()=>resolve(socket2)
        ;
        socket2.onerror = (err)=>reject(err)
        ;
    });
}
export function createRemote(resourceOrSocket, options1) {
    if (resourceOrSocket instanceof WebSocket) {
        return listen(resourceOrSocket).then((socket2)=>new Proxy(new Client1(socket2), wsProxyHandler)
        ).catch((err)=>Promise.reject(new BadServerDataError("An error event occured on the WebSocket connection.", -32005, err.stack))
        );
    } else {
        return new Proxy(new Client(resourceOrSocket, options1), httpProxyHandler);
    }
}

