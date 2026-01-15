import React from "react";

interface PlaceholderProps {
  title: string;
  body: string;
}

const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, body }) => (
  <div className="flex-1 flex flex-col">
    <section className="mb-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
        {title}
      </div>
      <div className="text-sm text-slate-500">{body}</div>
    </section>
    <section className="bg-white rounded-xl shadow-sm p-6 text-xs text-slate-500">
      Wiring for this module will come next. For now this is just a placeholder
      so the shell matches your future app.
    </section>
  </div>
);

export default PlaceholderPage;
