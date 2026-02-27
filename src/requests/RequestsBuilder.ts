import {cache} from "react";

type TaskRequest = {
    id: number;
    requested_id: number;
    resolve: (value: unknown | PromiseLike<unknown>) => void,
    status: "WAITING" | "PROCESSING" | "DONE" | "ERROR";
    result: string | undefined
}

const MAX_PUSH_INTERVAL_MS = 100;
const MAX_PUSH_SIZE = 500;

export class RequestsBuilder {
    tasks: TaskRequest[] = []
    lastPushTime = Date.now()
    ticker: NodeJS.Timeout | undefined = undefined
    counter: number = 0; // это для уникальных id

    /*
    Для чего нужен таймер:
     По сути здесь реализован примитивный поллинг для запросов.
     Каждую мс, когда в списке есть неотправленные запросы вызывается метод processTasks,
     который проверяет, можно ли отправить пакет запросов (прошло ли достаточно времени - MAX_PUSH_INTERVAL_MS с
     последнего, или если набралось MAX_PUSH_SIZE).
     Если все запросы сделаны (список тасок пуст), то поллинг останавливается.
     */
    startTimer() {
        if (!this.ticker) {
            this.ticker = setInterval(() => {
                this.processTasks().then()
            }, 1);
        }
    }

    stopTimer() {
        if (this.ticker) {
            clearInterval(this.ticker)
            this.ticker = undefined
        }
    }


    /*
     Временная функция для ассинхронной задержки
     */
    private sleep(ms: number) {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }


    /*
    Добавление таски в список неотправленных + обновление времени последней добавленной таски.
     */
    async addTaskRequest(task: TaskRequest) {
        this.tasks.push(task)
        this.lastPushTime = Date.now()
    }

    /*
    Основной метод для отправки тасок.
     */
    async processTasks() {
        if (this.tasks.length === 0) {
            this.stopTimer()
            return
        }
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
            await this.sendPacket(part)
        }
    }


    /*
    Отправка пакета данных.
     */
    async sendPacket(part: TaskRequest[]) {
        const query = part.map(task => task.requested_id) // список id, которые мы отправляем
        await this.sleep(50) // имитация запроса к api.
        for (const task of part) {
            task.result = "complete"
            task.status = "DONE"
            task.resolve("result value from api") // разблокируем поток в основном промисе. Отправляем а него результат таски
        }
    }

    /*
    Основной внешний метод. Он создает запросы.
     */
    async makeRequest(id: number) {
        this.startTimer() // запускаем таймер, если он еще не запущен
        let resolveRequest!: (value: unknown | PromiseLike<unknown>) => void; // внешний резольвер для промиса, чтобы иметь возможность разблокировать промис извне
        const waitForResult = new Promise(resolve => {
            resolveRequest = resolve;
        });

        await this.addTaskRequest(
            {
                id: ++this.counter,
                requested_id: id,
                status: "WAITING",
                result: undefined,
                resolve: resolveRequest
            }
        ) // создаем объект с таской
        const result = await waitForResult // ожидаем разблокировки извне
        return `ok ${id} ${result}` // возвращаем результат
    }
}

/*
cache гарантирует один объект билдера на весь рендер. По сути синглтон, но через next.
 */
export const getRequestsBuilder = cache(() => {
    return new RequestsBuilder();
});