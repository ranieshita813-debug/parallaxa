'use client'

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  BarChart, LineChart, PieChart, Activity, TrendingUp, Users, Eye,
  ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Layers, Sparkles
} from 'lucide-react';
import { useParams } from 'next/navigation';

interface AnalysisData {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface TimeData {
  date: Date;
  value: number;
}

const bnDigits: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

function toBanglaNumber(n: number | string): string {
  const s = n.toLocaleString('en-US');
  return s.replace(/\d/g, (d) => bnDigits[d] || d);
}

export default function AnalysisView({ data }: { data?: AnalysisData[] }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';
  const isBn = locale === 'bn';

  const barChartRef = useRef<SVGSVGElement>(null);
  const lineChartRef = useRef<SVGSVGElement>(null);
  const pieChartRef = useRef<SVGSVGElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'distribution'>('overview');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString(isBn ? 'bn-BD' : 'en-US'));
  }, [isBn]);

  const categoryData: AnalysisData[] = data || [
    { label: isBn ? 'আন্তর্জাতিক' : 'World', value: 450, secondaryValue: 120 },
    { label: isBn ? 'প্রযুক্তি' : 'Tech', value: 890, secondaryValue: 340 },
    { label: isBn ? 'ব্যবসা' : 'Business', value: 320, secondaryValue: 90 },
    { label: isBn ? 'খেলাধুলা' : 'Sports', value: 610, secondaryValue: 210 },
    { label: isBn ? 'স্বাস্থ্য' : 'Health', value: 240, secondaryValue: 60 },
  ];

  const trendData: TimeData[] = Array.from({ length: 14 }).map((_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000),
    value: Math.floor(Math.random() * 500) + 200
  }));

  // Render Bar Chart
  useEffect(() => {
    if (!barChartRef.current || activeTab !== 'overview') return;
    const svg = d3.select(barChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 600 300`).attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().rangeRound([0, width]).padding(0.35).domain(categoryData.map(d => d.label));
    const y = d3.scaleLinear().rangeRound([height, 0]).domain([0, (d3.max(categoryData, d => Math.max(d.value, d.secondaryValue || 0)) as number) * 1.15]);

    // Background horizontal grid lines
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ""))
      .attr("stroke-dasharray", "3 3")
      .attr("color", "#f1f5f9");

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .attr("color", "#475569")
      .attr("font-size", "11px")
      .attr("font-weight", "600");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .attr("color", "#64748b")
      .attr("font-size", "10px");

    // Primary bars
    g.selectAll(".bar")
      .data(categoryData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.label) as number)
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", "#09090b")
      .attr("rx", 6)
      .attr("ry", 6);

    // Secondary comparison bar
    g.selectAll(".bar-secondary")
      .data(categoryData)
      .enter().append("rect")
      .attr("x", d => (x(d.label) as number) + x.bandwidth() * 0.25)
      .attr("y", d => y(d.secondaryValue || 0))
      .attr("width", x.bandwidth() * 0.5)
      .attr("height", d => height - y(d.secondaryValue || 0))
      .attr("fill", "#94a3b8")
      .attr("opacity", 0.6)
      .attr("rx", 4);

  }, [categoryData, activeTab]);

  // Render Line Chart
  useEffect(() => {
    if (!lineChartRef.current || activeTab !== 'trends') return;
    const svg = d3.select(lineChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 600 300`).attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().range([0, width]).domain(d3.extent(trendData, d => d.date) as [Date, Date]);
    const y = d3.scaleLinear().rangeRound([height, 0]).domain([0, (d3.max(trendData, d => d.value) as number) * 1.2]);

    const line = d3.line<TimeData>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const area = d3.area<TimeData>()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Background horizontal grid lines
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ""))
      .attr("stroke-dasharray", "3 3")
      .attr("color", "#f1f5f9");

    g.append("path")
      .datum(trendData)
      .attr("fill", "rgba(15, 23, 42, 0.06)")
      .attr("d", area);

    g.append("path")
      .datum(trendData)
      .attr("fill", "none")
      .attr("stroke", "#020617")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .attr("color", "#64748b")
      .attr("font-size", "10px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .attr("color", "#64748b")
      .attr("font-size", "10px");

    // Add points
    g.selectAll(".dot")
      .data(trendData)
      .enter().append("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.value))
      .attr("r", 4)
      .attr("fill", "#ffffff")
      .attr("stroke", "#09090b")
      .attr("stroke-width", 2);

  }, [trendData, activeTab]);

  // Render Pie Chart
  useEffect(() => {
    if (!pieChartRef.current || activeTab !== 'distribution') return;
    const svg = d3.select(pieChartRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 35;

    svg.attr("viewBox", `0 0 600 300`).attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal<string>()
      .domain(categoryData.map(d => d.label))
      .range(['#09090b', '#334155', '#64748b', '#94a3b8', '#cbd5e1']);

    const pie = d3.pie<AnalysisData>().value(d => d.value);
    const arc = d3.arc<d3.PieArcDatum<AnalysisData>>().innerRadius(radius * 0.55).outerRadius(radius);
    const outerArc = d3.arc<d3.PieArcDatum<AnalysisData>>().innerRadius(radius * 1.1).outerRadius(radius * 1.1);

    const arcs = g.selectAll(".arc")
      .data(pie(categoryData))
      .enter().append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.label))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

    // Labels
    arcs.append("text")
      .attr("transform", d => `translate(${outerArc.centroid(d)})`)
      .attr("dy", ".35em")
      .style("text-anchor", d => {
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return (midangle < Math.PI ? 'start' : 'end');
      })
      .text(d => d.data.label)
      .attr("fill", "#475569")
      .attr("font-size", "11px")
      .attr("font-weight", "600");

  }, [categoryData, activeTab]);

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: isBn ? 'মোট ভিউ' : 'Total Views',
            value: isBn ? '১.২ মিলিয়ন' : '1.2M',
            trend: '+১২.৫%',
            icon: Eye,
          },
          {
            label: isBn ? 'গড় পড়ার সময়' : 'Avg. Read Time',
            value: isBn ? '৪ মিনিট ৩২ সেকেন্ড' : '4m 32s',
            trend: '+০.৮%',
            icon: Calendar,
          },
          {
            label: isBn ? 'পাঠক সম্পৃক্ততা' : 'Engagement Rate',
            value: isBn ? '২৪.৮%' : '24.8%',
            trend: '-২.৪%',
            icon: Activity,
          },
          {
            label: isBn ? 'সক্রিয় পাঠক' : 'Active Readers',
            value: isBn ? '১৮.৪ হাজার' : '18.4K',
            trend: '+১৫.২%',
            icon: Users,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="bg-slate-100 text-slate-800 p-2.5 rounded-2xl group-hover:bg-slate-950 group-hover:text-white transition-colors">
                <stat.icon size={18} />
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                  stat.trend.startsWith('+')
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-rose-700 bg-rose-50'
                }`}
              >
                {stat.trend}
                {stat.trend.startsWith('+') ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{stat.label}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-950">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Intelligence & Charts Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
          <div>
            <h3 className="text-lg font-extrabold text-slate-950 flex items-center gap-2">
              <Layers className="text-slate-900" size={20} />
              {isBn ? 'প্ল্যাটফর্ম অ্যানালাইসিস ও ট্রেন্ডস' : 'Platform Intelligence'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBn
                ? 'বিভাগভিত্তিক পাঠকপ্রিয়তা এবং সাম্প্রতিক নিবন্ধ পাঠের গ্রাফিক্যাল বিবরণ।'
                : 'Advanced real-time engagement and distribution insights.'}
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0 overflow-x-auto border border-slate-200/60">
            {[
              { id: 'overview', label: isBn ? 'ওভারভিউ' : 'Overview', icon: BarChart },
              { id: 'trends', label: isBn ? 'ট্রেন্ডস' : 'Trends', icon: LineChart },
              { id: 'distribution', label: isBn ? 'শেয়ার' : 'Distribution', icon: PieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="w-full aspect-[2/1] min-h-[260px] sm:min-h-[300px] flex items-center justify-center">
            {activeTab === 'overview' && (
              <svg ref={barChartRef} width="100%" height="100%" className="max-h-[300px] overflow-visible"></svg>
            )}
            {activeTab === 'trends' && (
              <svg ref={lineChartRef} width="100%" height="100%" className="max-h-[300px] overflow-visible"></svg>
            )}
            {activeTab === 'distribution' && (
              <svg ref={pieChartRef} width="100%" height="100%" className="max-h-[300px] overflow-visible"></svg>
            )}
          </div>

          {/* Breakdown cards */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {categoryData.map((d) => (
              <div
                key={d.label}
                className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <p className="text-[11px] font-bold text-slate-500 truncate">{d.label}</p>
                </div>
                <p className="text-lg font-extrabold text-slate-950">
                  {isBn ? toBanglaNumber(d.value) : d.value.toLocaleString()}
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 w-fit px-1.5 py-0.5 rounded-md">
                  <TrendingUp size={11} />
                  <span>+{isBn ? toBanglaNumber((Math.random() * 15 + 5).toFixed(1)) : (Math.random() * 15 + 5).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50/70 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <p className="text-slate-400 font-medium flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-600" />
            {isBn ? `সর্বশেষ আপডেট: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
          </p>
        </div>
      </div>
    </div>
  );
}
