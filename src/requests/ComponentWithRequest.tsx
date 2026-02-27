import {getRequestsBuilder} from "@/requests/RequestsBuilder";
import crypto from "crypto";

export default async function ComponentWithRequest(){
    const requestBuilder = getRequestsBuilder()
    const result = await requestBuilder.makeRequest(crypto.randomInt(1, 1001));

    return (
        <>
            <p>Request {result}</p>
        </>
    )
}