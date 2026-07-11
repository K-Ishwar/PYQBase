'use client'

import { useMemo } from 'react'
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { TopicHeatmapData } from '@/lib/hooks/useAnalytics'

interface HeatmapChartProps {
  topics: TopicHeatmapData[]
}

const CustomizedContent = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, colors, rank, name, value, weightage_percent } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : '#ffffff00',
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 ? (
        <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14}>
          {name}
        </text>
      ) : null}
      {depth === 1 ? (
        <text x={x + 4} y={y + 18} fill="#fff" fontSize={16} fillOpacity={0.9}>
          {index + 1}
        </text>
      ) : null}
    </g>
  );
};

export default function HeatmapChart({ topics }: HeatmapChartProps) {
  // Recharts Treemap requires data in a specific hierarchical format
  const data = useMemo(() => {
    return [
      {
        name: 'Topics',
        children: topics.map((t) => ({
          name: t.topic_name,
          size: t.weightage_percent || 0.1, // Treemap sizes based on weightage
          value: t.question_count,
          weightage_percent: t.weightage_percent,
        })),
      },
    ]
  }, [topics])

  // Custom colors for heatmap: Green -> Yellow -> Red
  const COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#b91c1c']

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#8884d8"
          content={<CustomizedContent colors={COLORS} />}
        >
          <Tooltip 
            formatter={(value: any, name: any, props: any) => {
              return [`${props.payload.value} questions`, `Weightage: ${props.payload.weightage_percent.toFixed(2)}%`]
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}
