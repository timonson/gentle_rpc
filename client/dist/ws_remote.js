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
class BadServerDataError extends Error {
    id;
    name;
    code;
    data;
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
function isObject(obj) {
    return obj !== null && typeof obj === "object" && Array.isArray(obj) === false;
}
class Client {
    textDecoder;
    payloadData;
    socket;
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
function createRemote1(socket2) {
    return listen(socket2).then((socket3)=>new Proxy(new Client(socket3), wsProxyHandler)
    ).catch((err)=>Promise.reject(new BadServerDataError(null, "An error event occured on the WebSocket connection.", -32005, err.stack))
    );
}
export { createRemote1 as createRemote };

