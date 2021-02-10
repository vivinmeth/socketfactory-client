
let absURLRegx = new RegExp('^(?:[a-z]+:)?//', 'i');
let isSSL = (): boolean => {
    return  window.location.protocol == 'https:';
}



export interface socketOptions {
    protocols?: string | string[];
    autoReconnect?: boolean;
    forceSSL?: boolean;
}
export interface reconnectConfig {
    reconnectInterval?: number;
    maxReconnects?: number;
}


export enum wsEvents {
    OPEN= 'open',
    MESSAGE='message',
    ERROR='error',
    CLOSE='close'
}


export class SocketConsumer {
    readonly scheme: ('ws' | 'wss') = 'ws';
    readonly host: string;
    readonly parsedURL: URL;
    forceSSL: boolean = false;
    autoReconnect: boolean = false;
    reconnectInterval = 1000;
    maxReconnects = 10;
    #currentReconnect = 1;
    #socket: WebSocket;

    get binaryType(){
        return this.#socket.binaryType;
    };
    set binaryType(binaryType){
        this.#socket.binaryType = binaryType;
    };
    get bufferedAmount(){
        return this.#socket.bufferedAmount;
    };
    get extensions(){
        return this.#socket.extensions;
    };
    get protocol(){
        return this.#socket.protocol;
    };
    get readyState(){
        return this.#socket.readyState;
    };
    get url(){
        return this.#socket.url;
    };

    constructor(
        readonly path: string,
        {
            protocols='',
            autoReconnect=false ,
            forceSSL=false,
        }: socketOptions = {},
        {
            reconnectInterval= 1000,
            maxReconnects = 10,
        }: reconnectConfig = {}
    ) {
        this.autoReconnect = autoReconnect
        this.reconnectInterval = reconnectInterval;
        this.maxReconnects = maxReconnects;
        this.forceSSL = forceSSL || isSSL();
        if(this.forceSSL){
            this.scheme = 'wss';
        }
        else{
            this.scheme = 'ws';
        }
        this.host = window.location.host
        if (path.length != 0){
            if(absURLRegx.test(this.path)){
                if(this.path[0]!='/') {
                    if (!this.path.includes('ws://') && !this.path.includes('wss://')) {

                        this.path = `${this.scheme}://${this.path.split('://')[1]}`;
                        console.warn("Wrong scheme! switched to WebSocket scheme.")
                    }
                    else{
                        if((this.forceSSL && this.path.includes('ws://'))){
                            this.path = `${this.scheme}://${this.path.split('://')[1]}`;
                            console.warn(`Switched to Secure WebSocket scheme as forceSSL was ${this.forceSSL} and url had mixed scheme.`);
                            console.info(``)
                        }
                    }

                }
                else{
                    this.path = `${this.scheme}:${this.path}`
                }
            }else{
                if(this.path[0] == '/')
                    this.path = this.path.slice(1);
                this.path = `${this.scheme}://${this.host}/${this.path}`;
            }
            //console.log(this.path);
            this.parsedURL = new URL(this.path);
            //console.log('updated:', this.parsedURL);

        }
        else{
            this.parsedURL = new URL(this.host);
        }
        this.#socket = this.#connect();
    }



    #connect =  () => {
        this.#socket = new WebSocket(this.parsedURL.href);
        this.#socket.onopen= async (ev) => {
            await (async () => {
                await this.onOpen(ev);
                return;
            })();
        };
        this.#socket.onmessage = async (ev) => {
            await (async () => {
                await this.onMessage(ev);
                return;
            })();
        };
        this.#socket.onerror= async (ev) => {
            await (async () => {
                await this.onError(ev);
                return;
            })();
            this.#socket.close();
        };
        this.#socket.onclose= async (ev) => {
            await (async () => {
                await this.onClose(ev);
                return;
            })();
            if(this.autoReconnect && this.#currentReconnect <= this.maxReconnects){
                this.#reconnect();
                this.#currentReconnect += 1;

            }
            else{
                console.error("Error:: Socket connection establishment failed! Ensure WebSocket url is correct and Server is live then refresh the page.");
                console.info('Socket Info:', this.#socket);
                console.info('Socket URL:', this.parsedURL);
            }

        };
        //console.log(this.#socket, this.#socket.readyState);
        return this.#socket;
    }

    #reconnect = () => {

        console.info('reconnecting... try:'+this.#currentReconnect);
        if(this.#currentReconnect == 0){
            this.#connect();
        }
        else{
            setTimeout(this.#connect, this.reconnectInterval);
        }
    }

    onOpen: ((ev: Event) => any) = (ev: Event): any => {
        console.info('Websocket connection open! Event:', ev);
    }

    onMessage: ((ev: MessageEvent) => any) = (ev: MessageEvent) => {
        console.info('Websocket new Message:', ev);
    }

    onError: ((ev: Event) => any) = (ev: Event) => {
        console.error('Websocket ERROR:: Traceback:', ev);

    }

    onClose: ((ev: Event) => any) = (ev: Event) => {
        console.info('Websocket connection closed!', ev);
    }

    send = (data: (string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView)): void =>{
        this.#socket.send(data);
    }

    close = (code?: number , reason?: string): void => {
        this.autoReconnect = false;
        this.#socket.close(code, reason);
        //console.log('closed:',this.#socket);
    }

    connect = () => {
        if(this.#socket.readyState !== this.#socket.CONNECTING && this.#socket.readyState !== this.#socket.OPEN){
            this.#connect();
        }
        else{
            console.warn('The Websocket is open or still connecting, wait or close the socket to create new connection.')
        }
    }

    reconnect = (autoReconnect?: boolean) => {
        let forceReconnect;
        if(this.autoReconnect){
            forceReconnect = this.#currentReconnect === this.maxReconnects;
        }
        else{
            forceReconnect = true;
        }

        if(forceReconnect){
            //console.log('reconnect...', this.#socket.readyState);
            if(autoReconnect){
                this.autoReconnect = autoReconnect;
            }
            if(this.#socket.readyState !== this.#socket.CONNECTING && this.#socket.readyState !== this.#socket.OPEN){
                this.#reconnect();
            }
            else{
                console.warn('The Websocket is open or still connecting, wait or close the socket to reconnect.')
            }
        }


    }



    addEventListener(event: ('open' | 'message' | 'error' | 'close'), handler: (ev: Event) => void){
        if(event === wsEvents.OPEN){
            this.onOpen = handler;
        }
        else if(event === wsEvents.MESSAGE){
            this.onMessage = handler;
        }
        else if(event === wsEvents.ERROR){
            this.onError = handler;
        }
        else if(event === wsEvents.CLOSE){
            this.onClose = handler;
        }
        else{
            console.error(`Socket.addEventListener(${event}, ${handler}) -> Event is not a valid WebSocket Event!`);
        }
    }

    getRawSocket = (): WebSocket => this.#socket;

}






