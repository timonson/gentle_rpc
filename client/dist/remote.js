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
class BadServerDataError extends Error {
    constructor(id, message, errorCode, data){
        super(message);
        this.id = id;
        this.name = this.constructor.name;
        this.code = errorCode;
        this.data = data;
    }
}
function validateRpcBasis(data1) {
    return data1?.jsonrpc === "2.0" && (typeof data1.id === "number" || typeof data1.id === "string" || data1.id === null);
}
function validateRpcSuccess(data1) {
    return "result" in data1;
}
function validateRpcFailure(data1) {
    return typeof data1?.error?.code === "number" && typeof data1.error.message === "string";
}
function validateResponse(data1) {
    if (validateRpcBasis(data1)) {
        if (validateRpcSuccess(data1)) return data1;
        else if (validateRpcFailure(data1)) {
            throw new BadServerDataError(data1.id, data1.error.message, data1.error.code, data1.error.data);
        }
    }
    throw new BadServerDataError(null, "Received data is no RPC response object.", -32003);
}
function send(resource, fetchInit) {
    return fetch(resource instanceof URL ? resource.href : resource, fetchInit).then((res)=>{
        if (!res.ok) {
            return Promise.reject(new BadServerDataError(null, `${res.status} '${res.statusText}' received instead of 200-299 range.`, -32002));
        } else if (res.status === 204 || res.headers.get("content-length") === "0") {
            return undefined;
        } else return res.json();
    }).catch((err)=>Promise.reject(new BadServerDataError(null, err.message, -32001))
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
            if (rpcResponseBatch === undefined && isNotification) {
                return rpcResponseBatch;
            } else if (Array.isArray(rpcResponseBatch) && rpcResponseBatch.length > 0) {
                return Array.isArray(batchObj) ? processBatchArray(rpcResponseBatch) : processBatchObject(rpcResponseBatch);
            } else {
                throw new BadServerDataError(null, "The server returned an invalid batch response.", -32004);
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
            return rpcResponse === undefined && isNotification ? undefined : validateResponse(rpcResponse).result;
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
            socket.onmessage = async (event)=>{
                let msg;
                if (event.data instanceof Blob) {
                    msg = this.getTextDecoder().decode(await event.data.arrayBuffer());
                } else if (event.data instanceof ArrayBuffer) {
                    msg = this.getTextDecoder().decode(event.data);
                } else {
                    msg = event.data;
                }
                resolve(msg);
            };
            socket.onclose = ()=>resolve(null)
            ;
        });
        await this.payloadData;
        if (socket.readyState < 2) {
            this.getPayloadData(socket);
        }
    }
    getTextDecoder() {
        return this.textDecoder || (this.textDecoder = new TextDecoder());
    }
    async *iterateOverPayloadData(rpcRequest, { isOnetime  }) {
        while(this.socket.readyState < 2){
            try {
                const payloadData = await this.payloadData;
                if (payloadData === null) {
                    break;
                }
                const parsedData = JSON.parse(payloadData);
                if (Array.isArray(parsedData) && !isOnetime && parsedData.length > 0) {
                    const invalid = parsedData.map(validateResponse).find((res)=>!isObject(res.result) || res.result.event !== "emitted"
                    );
                    if (invalid) {
                        throw new BadServerDataError(invalid.id ? invalid.id : null, "The server returned an invalid batch response.", -32004);
                    } else {
                        continue;
                    }
                } else {
                    const rpcResponse = validateResponse(parsedData);
                    if (!isOnetime && isObject(rpcResponse.result) && rpcResponse.result.id === rpcRequest.id) {
                        if (rpcResponse.result.event === "subscribed" || rpcResponse.result.event === "emitted") {
                            continue;
                        }
                        if (rpcResponse.result.event === "unsubscribed") {
                            break;
                        }
                    }
                    if (rpcResponse.id === rpcRequest.id) {
                        yield rpcResponse.result;
                        if (isOnetime) {
                            break;
                        }
                    }
                }
            } catch (err) {
                if (err.id === rpcRequest.id) {
                    yield Promise.reject(err);
                    if (isOnetime) {
                        break;
                    }
                }
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
        if (isNotification) return Promise.resolve(undefined);
        const generator = this.iterateOverPayloadData(rpcRequest, {
            isOnetime: true
        });
        return generator.next().then((p)=>p.value
        );
    }
    subscribe(method) {
        const rpcRequest = createRequest({
            method: "subscribe"
        });
        this.socket.send(JSON.stringify({
            ...rpcRequest,
            params: {
                method,
                id: rpcRequest.id
            }
        }));
        return {
            generator: this.iterateOverPayloadData(rpcRequest, {
                isOnetime: false
            }),
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
function createRemote1(resourceOrSocket, options1) {
    if (resourceOrSocket instanceof WebSocket) {
        return listen(resourceOrSocket).then((socket2)=>new Proxy(new Client1(socket2), wsProxyHandler)
        ).catch((err)=>Promise.reject(new BadServerDataError(null, "An error event occured on the WebSocket connection.", -32005, err.stack))
        );
    } else {
        return new Proxy(new Client(resourceOrSocket, options1), httpProxyHandler);
    }
}
export { createRemote1 as createRemote };

