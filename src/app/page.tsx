import ComponentWithRequest from "@/requests/ComponentWithRequest";

export const dynamic = "force-dynamic";
export default function Home() {
    const arr = new Array(100).fill(null);;
    return (
        <div className="size-screen">
            {arr.map((item, i) =><ComponentWithRequest key={i}/>)}
        </div>
    );
}
