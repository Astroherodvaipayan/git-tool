"use client";

import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { CommitActivity, calculateMetrics } from "@/app/lib/github";
import { BarChart3, LineChart, DownloadIcon, CalendarIcon, AlertCircle } from "lucide-react";

interface CommitActivityPanelProps {
  commitActivity: CommitActivity[];
  detailed?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

type ChartType = "bar" | "line" | "area";
type TimeRange = "year" | "month" | "week";

export function CommitActivityPanel({
  commitActivity,
  detailed = false,
  isLoading = false,
  error = null,
}: CommitActivityPanelProps) {
  const commitChartRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [showWeeklyAverages, setShowWeeklyAverages] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("year");
  
  // Calculate data for different time ranges
  const getFilteredData = () => {
    if (commitActivity.length === 0) return [];
    
    // Filter data based on selected time range
    const now = new Date();
    const currentTimestamp = Math.floor(now.getTime() / 1000);
    
    if (timeRange === "week") {
      // Last 7 days - find the most recent weeks that cover last 7 days
      return commitActivity.slice(-2); // Usually 2 weeks will cover the last 7 days
    } else if (timeRange === "month") {
      // Last 30 days ~ 4-5 weeks
      return commitActivity.slice(-5);
    } else {
      // Year - show all available data up to a year (52 weeks)
      return commitActivity.slice(-52);
    }
  };
  
  const filteredData = getFilteredData();
  const metrics = calculateMetrics(filteredData, []);

  useEffect(() => {
    // Add a small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (commitChartRef.current && filteredData.length > 0) {
        createCommitActivityChart(commitChartRef.current, filteredData, chartType, showWeeklyAverages);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (commitChartRef.current) {
        d3.select(commitChartRef.current).selectAll("*").remove();
      }
    };
  }, [filteredData, chartType, showWeeklyAverages, timeRange]);

  const noDataAvailable = commitActivity.length === 0;

  const exportChart = () => {
    if (!commitChartRef.current) return;
    
    const svg = commitChartRef.current.querySelector("svg");
    if (!svg) return;
    
    // Convert SVG to string
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    
    // Add XML declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    
    // Convert SVG string to Blob
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    
    // Create a download link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `commit-activity-${timeRange}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Get time range label
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'year': return 'Last Year';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Commit Activity</CardTitle>
          <div className="flex space-x-2">
            {/* Chart type selector */}
            <div className="bg-secondary rounded-md overflow-hidden flex">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 rounded-none ${chartType === 'bar' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setChartType("bar")}
                title="Bar Chart"
              >
                <BarChart3 size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 rounded-none ${chartType === 'line' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setChartType("line")}
                title="Line Chart"
              >
                <LineChart size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 rounded-none ${chartType === 'area' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setChartType("area")}
                title="Area Chart"
              >
                <LineChart size={16} className="fill-primary/20" />
              </Button>
            </div>
            {/* Time range selector */}
            <div className="bg-secondary rounded-md overflow-hidden flex">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 rounded-none ${timeRange === 'week' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setTimeRange("week")}
                title="Week view"
              >
                W
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 rounded-none ${timeRange === 'month' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setTimeRange("month")}
                title="Month view"
              >
                M
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 h-8 rounded-none ${timeRange === 'year' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setTimeRange("year")}
                title="Year view"
              >
                Y
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2" 
              onClick={exportChart}
              title="Export Chart"
            >
              <DownloadIcon size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="space-y-1">
              <p className="font-medium">Loading commit activity...</p>
              <p className="text-sm">GitHub is computing repository statistics</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground text-center space-y-3">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-destructive">Error loading commit activity</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : noDataAvailable ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground text-center space-y-3">
            <CalendarIcon className="h-8 w-8" />
            <p>No commit activity data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Weekly Commits - {getTimeRangeLabel()}</h3>
                <div className="flex items-center">
                  <label className="text-sm text-muted-foreground mr-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showWeeklyAverages} 
                      onChange={() => setShowWeeklyAverages(!showWeeklyAverages)}
                      className="mr-1"
                    />
                    Show 4-week average
                  </label>
                </div>
              </div>
              {filteredData.length > 0 ? (
                <div className="relative border rounded-md p-2 bg-card">
                  <div 
                    ref={commitChartRef} 
                    className="w-full h-72" 
                    style={{ minHeight: '288px', minWidth: '200px' }}
                  />
                  <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 p-1 rounded">
                    {filteredData.length} weeks of data
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-60 bg-secondary/30 rounded-md">
                  <p className="text-muted-foreground">Weekly commit data unavailable</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <MetricCard
                title="Average Commits Per Week"
                value={Math.round(metrics.averageCommitsPerWeek) || 0}
              />
              <MetricCard
                title="Total Commits"
                value={metrics.totalCommits || 0}
              />
              <MetricCard
                title="Recent Activity Trend"
                value={capitalizeFirstLetter(metrics.activityTrend.trend)}
                subtext={`${Math.abs(Math.round(metrics.activityTrend.changePercent || 0))}% ${
                  metrics.activityTrend.changePercent >= 0 ? "increase" : "decrease"
                }`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, subtext }: { title: string; value: number | string; subtext?: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-4 shadow-sm border border-secondary hover:shadow-md transition-all">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}

function createCommitActivityChart(
  element: HTMLElement, 
  data: CommitActivity[], 
  chartType: ChartType = 'bar',
  showAverage: boolean = false
) {
  try {
    // Clear previous chart if any
    d3.select(element).selectAll("*").remove();

    // Check if element has valid dimensions
    const clientWidth = element.clientWidth;
    const clientHeight = element.clientHeight;
    
    if (clientWidth <= 0 || clientHeight <= 0) {
      console.error("Chart container has invalid dimensions:", clientWidth, clientHeight);
      return;
    }

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = clientWidth - margin.left - margin.right;
    const height = clientHeight - margin.top - margin.bottom;

    // Create tooltip div
    const tooltip = d3.select(element)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "10");

    // Create SVG
    const svg = d3
      .select(element)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Check if data is valid
    if (!data || data.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .text("No commit data available");
      return;
    }

    // Create scales
    const x = d3
      .scaleBand()
      .domain(data.map((_, i) => i.toString()))
      .range([0, width])
      .padding(0.2);

    const maxValue = d3.max(data, d => d.total) || 10;
    const y = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .nice()
      .range([height, 0]);

    // Calculate moving average if needed
    let movingAverages: number[] = [];
    if (showAverage) {
      const windowSize = 4; // 4-week moving average
      for (let i = 0; i < data.length; i++) {
        if (i < windowSize - 1) {
          // Not enough data for a complete window
          movingAverages.push(0);
        } else {
          // Calculate average of last windowSize items
          const sum = data
            .slice(i - windowSize + 1, i + 1)
            .reduce((acc, d) => acc + d.total, 0);
          movingAverages.push(sum / windowSize);
        }
      }
    }

    // Create gradient for area chart
    if (chartType === 'area') {
      svg.append("linearGradient")
        .attr("id", "area-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", height)
        .attr("x2", 0).attr("y2", 0)
        .selectAll("stop")
        .data([
          {offset: "0%", color: "rgba(59, 130, 246, 0.0)"},
          {offset: "100%", color: "rgba(59, 130, 246, 0.5)"}
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);
    }

    // Render the chart based on type
    if (chartType === 'bar') {
      // Create and append the bar rectangles
      svg
        .selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d, i) => x(i.toString()) || 0)
        .attr("y", d => y(d.total))
        .attr("rx", 2) // rounded corners
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.total))
        .attr("fill", "rgba(59, 130, 246, 0.8)")
        .attr("stroke", "rgba(59, 130, 246, 1)")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
          d3.select(this)
            .attr("fill", "rgba(59, 130, 246, 1)");

          const date = new Date(d.week * 1000);
          const formattedDate = formatDateFull(date);

          tooltip
            .style("visibility", "visible")
            .html(`<strong>${formattedDate}</strong><br/>Commits: ${d.total}`)
            .style("left", `${event.offsetX + 10}px`)
            .style("top", `${event.offsetY - 25}px`);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", `${event.offsetX + 10}px`)
            .style("top", `${event.offsetY - 25}px`);
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("fill", "rgba(59, 130, 246, 0.8)");
          tooltip.style("visibility", "hidden");
        });
    } else if (chartType === 'line' || chartType === 'area') {
      // Create line generator
      const line = d3.line<CommitActivity>()
        .x((d, i) => (x(i.toString()) || 0) + x.bandwidth() / 2)
        .y(d => y(d.total))
        .curve(d3.curveMonotoneX); // smooth curve

      // Add the area if area chart
      if (chartType === 'area') {
        const area = d3.area<CommitActivity>()
          .x((d, i) => (x(i.toString()) || 0) + x.bandwidth() / 2)
          .y0(height)
          .y1(d => y(d.total))
          .curve(d3.curveMonotoneX);

        svg.append("path")
          .datum(data)
          .attr("class", "area")
          .attr("d", area)
          .attr("fill", "url(#area-gradient)");
      }

      // Add the line path
      svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "rgba(59, 130, 246, 1)")
        .attr("stroke-width", 2.5)
        .attr("d", line);

      // Add circles for each data point
      svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d, i) => (x(i.toString()) || 0) + x.bandwidth() / 2)
        .attr("cy", d => y(d.total))
        .attr("r", 4)
        .attr("fill", "white")
        .attr("stroke", "rgba(59, 130, 246, 1)")
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {
          d3.select(this)
            .attr("r", 6)
            .attr("fill", "rgba(59, 130, 246, 0.8)");

          const date = new Date(d.week * 1000);
          const formattedDate = formatDateFull(date);

          tooltip
            .style("visibility", "visible")
            .html(`<strong>${formattedDate}</strong><br/>Commits: ${d.total}`)
            .style("left", `${event.offsetX + 10}px`)
            .style("top", `${event.offsetY - 25}px`);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", `${event.offsetX + 10}px`)
            .style("top", `${event.offsetY - 25}px`);
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("r", 4)
            .attr("fill", "white");
          tooltip.style("visibility", "hidden");
        });
    }

    // Add moving average line if requested
    if (showAverage && movingAverages.length > 0) {
      const avgLine = d3.line<number>()
        .x((_, i) => (x(i.toString()) || 0) + x.bandwidth() / 2)
        .y(d => y(d))
        .curve(d3.curveMonotoneX);

      // Only show for points where we have a valid average
      const validAverages = movingAverages.map((avg, i) => ({ avg, i })).filter(d => d.avg > 0);
      
      svg.append("path")
        .datum(validAverages.map(d => d.avg))
        .attr("class", "avg-line")
        .attr("fill", "none")
        .attr("stroke", "rgba(239, 68, 68, 0.8)")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("d", avgLine);
        
      // Add legend for the average line
      svg.append("line")
        .attr("x1", width - 140)
        .attr("y1", 10)
        .attr("x2", width - 120)
        .attr("y2", 10)
        .attr("stroke", "rgba(239, 68, 68, 0.8)")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
        
      svg.append("text")
        .attr("x", width - 115)
        .attr("y", 14)
        .attr("class", "text-xs")
        .attr("fill", "currentColor")
        .text("4-week average");
    }

    // Add background for clarity
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none");

    // Add the X axis with improved formatting
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .attr("class", "text-muted-foreground text-xs")
      .call(
        d3
          .axisBottom(x)
          .tickFormat((d, i) => {
            const date = new Date(data[parseInt(d.toString())].week * 1000);
            
            // Determine how many ticks to show based on data length
            let tickInterval = Math.max(1, Math.floor(data.length / 12));
            
            if (data.length <= 5) {
              // For small datasets, show all dates
              return formatDate(date);
            } else {
              // For larger datasets, show selected dates
              return i % tickInterval === 0 ? formatDate(date) : "";
            }
          })
      );

    // Add X axis label
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .attr("class", "text-xs text-muted-foreground")
      .text("Date");

    // Add the Y axis with better tick formatting
    svg
      .append("g")
      .attr("class", "text-muted-foreground text-xs")
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickFormat(d => {
            const num = d.valueOf();
            if (num >= 1000) {
              return `${(num/1000).toFixed(1)}k`;
            }
            return d.toString();
          })
      );

    // Add the Y axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 15)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .attr("class", "text-xs text-muted-foreground")
      .text("Commits");
  } catch (error) {
    console.error("Error creating commit activity chart:", error);
  }
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to format dates consistently (short format)
function formatDate(date: Date): string {
  // Format: MMM DD
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

// Helper function to format dates with year (for tooltips)
function formatDateFull(date: Date): string {
  // Format: MMM DD, YYYY
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
} 