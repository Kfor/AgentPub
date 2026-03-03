"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  skillTags: string[];
  budgetMin: number;
  budgetMax: number;
  status: string;
  verificationLevel: number;
  assigneeId: string | null;
  deadline: string | null;
  createdAt: string;
  creator: { id: string; name: string; image: string | null; userType: string };
  bids: Array<{
    id: string;
    amount: number;
    proposal: string;
    estimatedDays: number | null;
    accepted: boolean;
    createdAt: string;
    bidder: { id: string; name: string; image: string | null; userType: string };
  }>;
  deliveries: Array<{
    id: string;
    content: string;
    fileUrls: string[];
    status: string;
    createdAt: string;
    submitter: { id: string; name: string };
  }>;
  escrow: { id: string; amount: number; status: string; platformFee: number } | null;
  dispute: { id: string; reason: string; status: string; aiVerdict: string | null; resolution: string | null } | null;
  reviews: Array<{ id: string; rating: number; comment: string | null; author: { id: string; name: string } }>;
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Bid form
  const [bidAmount, setBidAmount] = useState("");
  const [bidProposal, setBidProposal] = useState("");
  const [bidDays, setBidDays] = useState("");
  const [bidLoading, setBidLoading] = useState(false);

  // Delivery form
  const [deliveryContent, setDeliveryContent] = useState("");
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Dispute form
  const [disputeReason, setDisputeReason] = useState("");

  const [actionMsg, setActionMsg] = useState("");

  function fetchTask() {
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTask(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!task) return <div className="p-8 text-center text-gray-500">Task not found</div>;

  const isCreator = session?.user?.id === task.creator.id;
  const isAssignee = session?.user?.id === task.assigneeId;

  async function submitBid() {
    setBidLoading(true);
    setActionMsg("");
    const res = await fetch(`/api/tasks/${id}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: bidAmount, proposal: bidProposal, estimatedDays: bidDays || null }),
    });
    setBidLoading(false);
    if (res.ok) {
      setActionMsg("Bid submitted!");
      setBidAmount("");
      setBidProposal("");
      setBidDays("");
      fetchTask();
    } else {
      const data = await res.json();
      setActionMsg(data.error || "Failed to submit bid");
    }
  }

  async function acceptBid(bidId: string) {
    const res = await fetch(`/api/tasks/${id}/bids`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId }),
    });
    if (res.ok) {
      setActionMsg("Bid accepted! Escrow created.");
      fetchTask();
    } else {
      const data = await res.json();
      setActionMsg(data.error || "Failed");
    }
  }

  async function submitDelivery() {
    setDeliveryLoading(true);
    const res = await fetch(`/api/tasks/${id}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: deliveryContent }),
    });
    setDeliveryLoading(false);
    if (res.ok) {
      setActionMsg("Delivery submitted!");
      setDeliveryContent("");
      fetchTask();
    } else {
      const data = await res.json();
      setActionMsg(data.error || "Failed");
    }
  }

  async function verifyDelivery(action: "approve" | "reject") {
    const res = await fetch(`/api/tasks/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setActionMsg(action === "approve" ? "Delivery approved! Funds released." : "Delivery rejected.");
      fetchTask();
    }
  }

  async function initiateDispute() {
    const res = await fetch(`/api/tasks/${id}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: disputeReason }),
    });
    if (res.ok) {
      setActionMsg("Dispute created.");
      setDisputeReason("");
      fetchTask();
    }
  }

  async function triggerArbitration() {
    const res = await fetch(`/api/tasks/${id}/dispute/arbitrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      setActionMsg(`Arbitration result: ${data.resolution} — ${data.reasoning}`);
      fetchTask();
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {actionMsg && (
        <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">{actionMsg}</div>
      )}

      {/* Task Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <StatusBadge status={task.status} />
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>
                Posted by{" "}
                <Link href={`/profile/${task.creator.id}`} className="text-indigo-600 hover:underline">
                  {task.creator.name}
                </Link>{" "}
                <StatusBadge status={task.creator.userType} />
              </span>
              <span>{task.category}</span>
              <span>{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {task.budgetMin === task.budgetMax
                ? `${task.budgetMin}`
                : `${task.budgetMin} - ${task.budgetMax}`}
            </div>
            <div className="text-sm text-gray-500">USDC</div>
          </div>
        </div>

        <div className="mt-4 prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{task.description}</p>
        </div>

        {task.skillTags.length > 0 && (
          <div className="mt-4 flex gap-1 flex-wrap">
            {task.skillTags.map((tag) => (
              <span key={tag} className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {task.deadline && (
          <p className="mt-3 text-sm text-gray-500">
            Deadline: {new Date(task.deadline).toLocaleDateString()}
          </p>
        )}

        <p className="mt-2 text-sm text-gray-500">
          Verification: L{task.verificationLevel} ({["", "Automatic", "Requester Review", "AI Arbitration"][task.verificationLevel]})
        </p>
      </div>

      {/* Escrow Info */}
      {task.escrow && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-gray-900">Escrow</h3>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Amount:</span>{" "}
              <span className="font-medium">{task.escrow.amount} USDC</span>
            </div>
            <div>
              <span className="text-gray-500">Fee:</span>{" "}
              <span className="font-medium">{task.escrow.platformFee.toFixed(2)} USDC (5%)</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span> <StatusBadge status={task.escrow.status} />
            </div>
          </div>
        </div>
      )}

      {/* Bids */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Bids ({task.bids.length})
        </h2>
        {task.bids.length === 0 ? (
          <p className="text-sm text-gray-500">No bids yet.</p>
        ) : (
          <div className="space-y-3">
            {task.bids.map((bid) => (
              <div
                key={bid.id}
                className={`rounded-lg border p-4 bg-white ${bid.accepted ? "border-green-300 bg-green-50" : "border-gray-200"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link href={`/profile/${bid.bidder.id}`} className="font-medium text-gray-900 hover:underline">
                      {bid.bidder.name}
                    </Link>
                    <StatusBadge status={bid.bidder.userType} />
                    {bid.accepted && <span className="text-green-600 text-xs font-medium">Accepted</span>}
                  </div>
                  <span className="font-semibold text-gray-900">{bid.amount} USDC</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{bid.proposal}</p>
                {bid.estimatedDays && (
                  <p className="mt-1 text-xs text-gray-400">Est. {bid.estimatedDays} days</p>
                )}
                {isCreator && task.status === "OPEN" && !bid.accepted && (
                  <button
                    onClick={() => acceptBid(bid.id)}
                    className="mt-2 rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-500"
                  >
                    Accept Bid
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Submit Bid */}
        {session?.user && !isCreator && task.status === "OPEN" && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Place a Bid</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Amount (USDC)"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Est. days (optional)"
                  value={bidDays}
                  onChange={(e) => setBidDays(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                placeholder="Your proposal..."
                value={bidProposal}
                onChange={(e) => setBidProposal(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={submitBid}
                disabled={bidLoading || !bidAmount || !bidProposal}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {bidLoading ? "Submitting..." : "Submit Bid"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deliveries */}
      {(task.status === "IN_PROGRESS" ||
        task.status === "PENDING_VERIFICATION" ||
        task.status === "COMPLETED") && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Deliveries</h2>
          {task.deliveries.length === 0 ? (
            <p className="text-sm text-gray-500">No deliveries yet.</p>
          ) : (
            <div className="space-y-3">
              {task.deliveries.map((d) => (
                <div key={d.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{d.submitter.name}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.content}</p>
                  {d.fileUrls.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">Files: {d.fileUrls.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit Delivery */}
          {isAssignee && task.status === "IN_PROGRESS" && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Submit Delivery</h3>
              <textarea
                placeholder="Describe your delivery..."
                value={deliveryContent}
                onChange={(e) => setDeliveryContent(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={submitDelivery}
                disabled={deliveryLoading || !deliveryContent}
                className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {deliveryLoading ? "Submitting..." : "Submit Delivery"}
              </button>
            </div>
          )}

          {/* Verify Delivery */}
          {isCreator && task.status === "PENDING_VERIFICATION" && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => verifyDelivery("approve")}
                className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
              >
                Approve & Release Payment
              </button>
              <button
                onClick={() => verifyDelivery("reject")}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dispute */}
      {task.dispute ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-bold text-red-900">Dispute</h2>
          <p className="mt-1 text-sm text-red-700">{task.dispute.reason}</p>
          <p className="mt-1 text-xs text-red-500">Status: {task.dispute.status}</p>
          {task.dispute.aiVerdict && (
            <div className="mt-2 rounded bg-white p-3 text-sm">
              <p className="font-medium">AI Verdict:</p>
              <p className="text-gray-700">{task.dispute.aiVerdict}</p>
              <p className="mt-1 text-xs text-gray-500">Resolution: {task.dispute.resolution}</p>
            </div>
          )}
          {task.dispute.status === "OPEN" && (
            <button
              onClick={triggerArbitration}
              className="mt-3 rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500"
            >
              Request AI Arbitration
            </button>
          )}
        </div>
      ) : (
        (isCreator || isAssignee) &&
        (task.status === "PENDING_VERIFICATION" || task.status === "IN_PROGRESS") && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Raise a Dispute</h3>
            <textarea
              placeholder="Reason for dispute..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={initiateDispute}
              disabled={!disputeReason}
              className="mt-2 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
            >
              Initiate Dispute
            </button>
          </div>
        )
      )}

      {/* Reviews */}
      {task.reviews.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews</h2>
          <div className="space-y-3">
            {task.reviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{r.author.name}</span>
                  <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
