"use client";

import React from "react";

interface CanvasBlock {
  text: string;
  refs: string[];
}

interface BusinessModelCanvasData {
  key_partners: CanvasBlock;
  key_activities: CanvasBlock;
  key_resources: CanvasBlock;
  value_propositions: CanvasBlock;
  customer_relationships: CanvasBlock;
  channels: CanvasBlock;
  customer_segments: CanvasBlock;
  cost_structure: CanvasBlock;
  revenue_streams: CanvasBlock;
}

interface BusinessModelCanvasProps {
  data: BusinessModelCanvasData;
}

export default function BusinessModelCanvas({
  data,
}: BusinessModelCanvasProps) {
  const Block = ({
    title,
    content,
    color,
    className = "",
  }: {
    title: string;
    content: CanvasBlock;
    color: string;
    className?: string;
  }) => (
    <div
      className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 ${color} ${className} w-full max-w-full min-w-0`}
    >
      <div className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] mb-1.5 uppercase tracking-wide break-words">
        {title}
      </div>
      <div className="text-xs sm:text-sm text-[color:var(--foreground)] opacity-90 leading-relaxed break-words">
        {content.text || "Not specified"}
      </div>
    </div>
  );

  const allRefs = [
    ...data.key_partners.refs,
    ...data.key_activities.refs,
    ...data.key_resources.refs,
    ...data.value_propositions.refs,
    ...data.customer_relationships.refs,
    ...data.channels.refs,
    ...data.customer_segments.refs,
    ...data.cost_structure.refs,
    ...data.revenue_streams.refs,
  ].filter((ref, index, self) => ref && self.indexOf(ref) === index);

  return (
    <div className="space-y-2 w-full max-w-full overflow-x-hidden">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-10 w-full max-w-full">
      {/* Key Partners */}
      <div className="lg:col-span-2 lg:row-span-2">
        <Block
          title="Key Partners"
          content={data.key_partners}
          color="border-red-500/30 bg-red-500/5"
          className="lg:h-full"
        />
      </div>

      {/* Key Activities */}
      <div className="lg:col-span-2">
        <Block
          title="Key Activities"
          content={data.key_activities}
          color="border-blue-500/30 bg-blue-500/5"
        />
      </div>

      {/* Value Propositions */}
      <div className="lg:col-span-2 lg:row-span-2">
        <Block
          title="Value Propositions"
          content={data.value_propositions}
          color="border-emerald-500/30 bg-emerald-500/5"
          className="lg:h-full"
        />
      </div>

      {/* Customer Relationships */}
      <div className="lg:col-span-2">
        <Block
          title="Customer Relationships"
          content={data.customer_relationships}
          color="border-amber-500/30 bg-amber-500/5"
        />
      </div>

      {/* Customer Segments */}
      <div className="lg:col-span-2 lg:row-span-2">
        <Block
          title="Customer Segments"
          content={data.customer_segments}
          color="border-pink-500/30 bg-pink-500/5"
          className="lg:h-full"
        />
      </div>

      {/* Key Resources */}
      <div className="lg:col-start-3 lg:col-span-2">
        <Block
          title="Key Resources"
          content={data.key_resources}
          color="border-blue-500/30 bg-blue-500/5"
        />
      </div>

      {/* Channels */}
      <div className="lg:col-start-7 lg:col-span-2">
        <Block
          title="Channels"
          content={data.channels}
          color="border-amber-500/30 bg-amber-500/5"
        />
      </div>

      {/* Cost Structure */}
      <div className="lg:col-span-5">
        <Block
          title="Cost Structure"
          content={data.cost_structure}
          color="border-red-500/30 bg-red-500/5"
        />
      </div>

      {/* Revenue Streams */}
      <div className="lg:col-span-5">
        <Block
          title="Revenue Streams"
          content={data.revenue_streams}
          color="border-green-500/30 bg-green-500/5"
        />
      </div>
      </div>
      
      {allRefs.length > 0 && (
        <div className="text-[10px] opacity-50 mt-2">
          Sources: {allRefs.join(", ")}
        </div>
      )}
    </div>
  );
}
