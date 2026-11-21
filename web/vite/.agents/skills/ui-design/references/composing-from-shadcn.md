# Composing Components with shadcn/ui

## Core Principle

shadcn components are **composable primitives**. Combine them with Tailwind utilities to build any UI.

---

## Composition Patterns

### 1. Card + Form

```tsx
<Card>
   <CardHeader>
      <CardTitle>Login</CardTitle>
   </CardHeader>
   <CardContent className="space-y-4">
      <div className="space-y-2">
         <Label htmlFor="email">Email</Label>
         <Input id="email" type="email" />
      </div>
      <div className="space-y-2">
         <Label htmlFor="password">Password</Label>
         <Input id="password" type="password" />
      </div>
   </CardContent>
   <CardFooter>
      <Button className="w-full">Sign in</Button>
   </CardFooter>
</Card>
```

### 2. List with Separators

```tsx
<Card>
   <CardContent className="space-y-0">
      {items.map((item, i) => (
         <div key={item.id}>
            {i > 0 && <Separator className="my-2" />}
            <div className="flex items-center justify-between">
               <p>{item.title}</p>
               <Badge>{item.count}</Badge>
            </div>
         </div>
      ))}
   </CardContent>
</Card>
```

### 3. Stats Grid

```tsx
function StatCard({ label, value }) {
   return (
      <Card>
         <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
               {label}
            </CardTitle>
         </CardHeader>
         <CardContent>
            <div className="text-2xl font-bold">{value}</div>
         </CardContent>
      </Card>
   );
}

// Usage
<div className="grid grid-cols-3 gap-4">
   <StatCard label="Users" value="1,234" />
   <StatCard label="Revenue" value="$45k" />
   <StatCard label="Orders" value="567" />
</div>;
```

### 4. Avatar Row

```tsx
<div className="flex items-center gap-4">
   <Avatar>
      <AvatarImage src={avatar} />
      <AvatarFallback>{name[0]}</AvatarFallback>
   </Avatar>
   <div className="flex-1">
      <p className="font-medium">{name}</p>
      <p className="text-sm text-muted-foreground">{email}</p>
   </div>
   <Button variant="ghost" size="sm">
      View
   </Button>
</div>
```

### 5. Card with Dropdown

```tsx
<Card>
   <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>Title</CardTitle>
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
               ⋯
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
               Delete
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   </CardHeader>
</Card>
```

### 6. Inline Form

```tsx
<form action="/search" className="flex items-end gap-4">
   <Input className="flex-1" placeholder="Search..." />
   <Button>Go</Button>
</form>
```

---

## Layout Utilities

| Class                     | Purpose                           |
| ------------------------- | --------------------------------- |
| `space-y-4`               | Vertical spacing between children |
| `flex items-center gap-4` | Horizontal row alignment          |
| `grid grid-cols-3 gap-4`  | Grid layout                       |
| `flex-1`                  | Fill available space              |
| `truncate`                | Text ellipsis overflow            |

---

## Rules

1. **Compose, don't modify** — Use wrapper divs with Tailwind, not component internals
2. **Extract reusable pieces** — If used 2+ times, make it a component
3. **Use variants** — `<Button variant="ghost">` not custom CSS
4. **Layer with Tailwind** — `<Card className="flex items-center">`
