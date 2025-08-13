import { Constant } from "../common/Constant";
import { ConductorInternalError } from "../common/errors/ConductorInternalError";
import type { IChannel, Subscriber } from "./types";

export class Channel<T> implements IChannel<T> {
    readonly name: string;

    /** The underlying MessagePort of this Channel. */
    private __port!: MessagePort; // replacePort assigns this in the constructor

    /** The callbacks subscribed to this Channel. */
    private readonly __subscribers: Set<Subscriber<T>> = new Set();

    /** Is the Channel in a valid state? */
    private __isAlive: boolean = true;

    /** Messages held temporarily while waiting for a listener. */
    private __waitingMessages?: T[] = [];

    send(message: T, transfer?: Transferable[]): void {
        this.__verifyAlive();
        this.__port.postMessage(message, transfer ?? []);
    }
    subscribe(subscriber: Subscriber<T>): void {
        this.__verifyAlive();
        this.__subscribers.add(subscriber);
        if (this.__waitingMessages) {
            for (const data of this.__waitingMessages) {
                subscriber(data);
            }
            delete this.__waitingMessages;
        }
    }
    unsubscribe(subscriber: Subscriber<T>): void {
        this.__verifyAlive();
        this.__subscribers.delete(subscriber);
    }
    close(): void {
        this.__verifyAlive();
        this.__isAlive = false;
        this.__port?.close();
    }

    /**
     * Check if this Channel is allowed to be used.
     * @throws Throws an error if the Channel has been closed.
     */
    private __verifyAlive() {
        if (!this.__isAlive) throw new ConductorInternalError(`Channel ${this.name} has been closed`);
    }

    /**
     * Dispatch some data to subscribers.
     * @param data The data to be dispatched to subscribers.
     */
    private __dispatch(data: T): void {
        this.__verifyAlive();
        if (this.__waitingMessages) {
            // set a limit on how many setup messages to hold
            // this prevents unlimited memory leak if the channel will never be listened to
            if (this.__waitingMessages.length >= Constant.SETUP_MESSAGES_BUFFER_SIZE) {
                // not an error, since non-listening of channel is allowed by design
                return console.warn("Channel buffer full; message dropped (no subscribers on channel)", data);
            }
            this.__waitingMessages.push(data);
        } else {
            for (const subscriber of this.__subscribers) {
                subscriber(data);
            }
        }
    }

    /**
     * Listens to the port's message event, and starts the port.
     * Messages will be buffered until the first subscriber listens to the Channel.
     * @param port The MessagePort to listen to.
     */
    listenToPort(port: MessagePort): void {
        port.addEventListener("message", e => this.__dispatch(e.data));
        port.start();
    }

    /**
     * Replaces the underlying MessagePort of this Channel and closes it, and starts the new port.
     * @param port The new port to use.
     */
    replacePort(port: MessagePort): void {
        this.__verifyAlive();
        this.__port?.close();
        this.__port = port;
        this.listenToPort(port);
    }

    constructor(name: string, port: MessagePort) {
        this.name = name;
        this.replacePort(port);
    }
}
