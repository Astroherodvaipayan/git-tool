"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/app/lib/utils"

interface TreeProps extends React.HTMLAttributes<HTMLDivElement> {}

const Tree = React.forwardRef<HTMLDivElement, TreeProps>(
  ({ className, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn("tree", className)}
        {...props}
      />
    )
  }
)
Tree.displayName = "Tree"

interface TreeNodeProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  defaultOpen?: boolean
}

const TreeNode = React.forwardRef<HTMLDivElement, TreeNodeProps>(
  ({ className, label, children, defaultOpen = false, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)
    const hasChildren = React.Children.count(children) > 0

    return (
      <div ref={ref} className={cn("tree-node", className)} {...props}>
        <div 
          className={cn(
            "tree-node-content flex items-center py-1",
            hasChildren && "cursor-pointer"
          )}
          onClick={() => hasChildren && setIsOpen(!isOpen)}
        >
          {hasChildren && (
            <ChevronRight 
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                isOpen && "rotate-90"
              )} 
            />
          )}
          <div className="tree-node-label ml-1">{label}</div>
        </div>
        {hasChildren && isOpen && (
          <div className="tree-node-children ml-4 border-l pl-2 pt-1">
            {children}
          </div>
        )}
      </div>
    )
  }
)
TreeNode.displayName = "TreeNode"

export { Tree, TreeNode } 