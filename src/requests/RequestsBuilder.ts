import {cache} from "react";

type TaskRequest = {
    id: number;
    requested_id: number;
    resolve: (value: unknown | PromiseLike<unknown>) => void,
    status: "WAITING" | "PROCESSING" | "DONE" | "ERROR";
    result: string | undefined
}

const MAX_PUSH_INTERVAL_MS = 100;
const MAX_PUSH_SIZE = 100;

export class RequestsBuilder {
    tasks: TaskRequest[] = []
    completedTasks: TaskRequest[] = []
    lastPushTime = Date.now()
    debugProfilerTime = Date.now()
    ticker: NodeJS.Timeout | undefined = undefined

    startTimer() {
        if (!this.ticker){
            this.ticker = setInterval(() => {
                // console.log("tick", this.getTime())
                this.processTasks()
            }, 1);
        }
    }

    stopTimer() {
        if(this.ticker){
            clearInterval(this.ticker)
            this.ticker = undefined
        }
    }

    getTime = () => {
        const time = Date.now() - this.debugProfilerTime
        this.debugProfilerTime = Date.now()
        return time
    }



    constructor() {
        // console.log("create builder for request", this.getTime());

    }


    getTaskResult(taskId: number): string | undefined {
        const task = this.completedTasks.find(task => task.id === taskId)
        if (task?.status !== "DONE") {
            return undefined
        }
        return task.result
    }

    private sleep(ms: number) {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    async addTaskRequest(task: TaskRequest) {
        // console.log(`add task request ${task.requested_id}`, this.getTime());
        this.tasks.push(task)
        this.lastPushTime = Date.now()
    }


    async processTasks() {
        if (this.tasks.length === 0) {
            this.stopTimer()
            return
        }
        // console.log("process tasks", this.getTime())
        if (this.tasks.length >= 5 || Date.now() - this.lastPushTime > MAX_PUSH_INTERVAL_MS) {
            let counter = 0
            const part = []
            while (counter < MAX_PUSH_SIZE) {
                const task = this.tasks.shift()
                if (!task || task.status === "DONE") {
                    break
                }
                part.push(task)
                counter++
            }
            await this.makeRequests(part)
        }
    }

    async makeRequests(part: TaskRequest[]) {
        const query = part.map(task => task.requested_id)
        // console.log("execute query with ids", query, this.getTime())
        await this.sleep(50)
        for (const task of part) {
            task.result = "complete"
            task.status = "DONE"
            task.resolve("result")
        }
        // console.log(`part with ids: ${query} done`, this.getTime())
    }


    async makeRequest(id: number) {
        this.startTimer()
        // console.log(`add request with id ${id}`, this.getTime());
        let resolveRequest!: (value: unknown | PromiseLike<unknown>) => void;
        const waitForResult = new Promise(resolve => {
            resolveRequest = resolve;
        });

        await this.addTaskRequest(
            {
                id: id,
                requested_id: id,
                status: "WAITING",
                result: undefined,
                resolve: resolveRequest
            }
        )
        await waitForResult
        return `ok ${id}`
    }
}

// Один инстанс на один request (на один рендер страницы)
export const getRequestsBuilder = cache(() => {
    return new RequestsBuilder();
});