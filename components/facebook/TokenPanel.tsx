"use client"

interface Props {
    userName: string | null
    userToken: string | null
}

export function TokenPanel({ userName, userToken }: Props) {
    if (!userToken) return null

    return (
        <div className="rounded-xl border p-4 mb-6">
            <h3 className="font-semibold mb-2">
                Logged in as {userName}
            </h3>

            <div className="text-sm break-all">
                {userToken.slice(0, 10)}...
            </div>
        </div>
    )
}