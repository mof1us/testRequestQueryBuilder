import {cache} from "react";

type TaskRequest = {
    id: number;
    requested_id: number;
    status: "WAITING" | "PROCESSING" | "DONE" | "ERROR";
    result: string | undefined
}

const MAX_PUSH_INTERVAL_MS = 100;
const MAX_PUSH_SIZE = 5;

export class RequestsBuilder {
    tasks: TaskRequest[] = []
    completedTasks: TaskRequest[] = []
    lastPushTime = Date.now()

    constructor() {
        console.log("create builder for request");
    }


    getTaskResult(taskId: number): string | undefined {
        const task = this.completedTasks.find(task => task.id === taskId)
        if (task?.status !== "DONE"){
            return undefined
        }
        return task.result
    }

    private sleep(ms: number) {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }

    async waitTaskResult(taskId: number) {
        let result = this.getTaskResult(taskId);
        const intervalMs = 250
        while (!result) {
            result = this.getTaskResult(taskId);
            await this.sleep(intervalMs);
            await this.processTasks()
            console.log(`Waiting for ${taskId}`)
        }
        console.log(`Result for task ${taskId} recieved`)
        return result
    }

    async addTaskRequest(task: TaskRequest) {
        this.tasks.push(task)
        this.lastPushTime = Date.now()
    }

    async processTasks() {
        if (this.tasks.length === 0){
            return
        }
        console.log("process tasks")
        if (this.tasks.length >= 5 || Date.now() - this.lastPushTime > MAX_PUSH_INTERVAL_MS) {
            let counter = 0
            const part = []
            while (counter < MAX_PUSH_SIZE) {
                const task = this.tasks.shift()
                if (!task || task.status === "DONE"){
                    break
                }
                part.push(task)
                counter++
            }
            await this.makeRequests(part)
        }
    }
    
    async makeRequests(part: TaskRequest[]){
        const query = part.map(task => task.requested_id)
        console.log("execute query with ids", query)
        await this.sleep(50)
        for (const task of part) {
            task.result = "complete"
            task.status = "DONE"
            this.completedTasks.push(task)
        }
        console.log(`part with ids: ${query} done`)
    }


    async makeRequest(id: number) {
        console.log(`add request with id ${id}`);
        await this.addTaskRequest(
            {
                id: id,
                requested_id: id,
                status: "WAITING",
                result: undefined,
            }
        )
        const result = await this.waitTaskResult(id)

        return `ok ${id} ${result}`
    }
}

// Один инстанс на один request (на один рендер страницы)
export const getRequestsBuilder = cache(() => {
    return new RequestsBuilder();
});