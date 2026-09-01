import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export function Breadcrumbs({ items }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <span key={item.label} className="flex items-center gap-1.5">
              <BreadcrumbItem>
                {isLast || !item.onSelect ? (
                  <BreadcrumbPage className="font-mono text-xs">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button className="font-mono text-xs" onClick={item.onSelect}>
                      {item.label}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
