"use client";

export default function ConnectAmazonButton() {
  const onClick = () => {
    window.location.href = "/api/integrations/amazon/connect?tenant=dev";
  };

  return (
    <button
      onClick={onClick}
      className="rounded-lg px-4 py-2 border border-gray-300 hover:bg-gray-50"
      type="button"
    >
      Connect Amazon (OAuth)
    </button>
  );
}
