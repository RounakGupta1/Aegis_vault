import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_CATEGORIES, type VaultPayload, type VaultRecord } from "../../types/vault";
import { Button } from "../ui/Button";
import { Input, Label, Textarea } from "../ui/Field";
import { GeneratorPanel } from "../generator/GeneratorPanel";

const schema = z.object({
  type: z.enum(["login", "note", "card", "identity"]),
  title: z.string().min(1),
  username: z.string(),
  password: z.string(),
  url: z.string(),
  category: z.string(),
  notes: z.string(),
  tags: z.string(),
  favorite: z.boolean(),
  content: z.string(),
  cardholder: z.string(),
  number: z.string(),
  expiryMonth: z.string(),
  expiryYear: z.string(),
  cvv: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  country: z.string(),
});

type FormValues = z.infer<typeof schema>;

function toPayload(values: FormValues): VaultPayload {
  const tags = values.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (values.type === "note") {
    return {
      type: "note",
      title: values.title,
      content: values.content,
      category: values.category,
      tags,
      favorite: values.favorite,
    };
  }
  if (values.type === "card") {
    const digits = values.number.replace(/\s/g, "");
    return {
      type: "card",
      title: values.title,
      cardholder: values.cardholder,
      number: digits,
      last4: digits.slice(-4),
      expiryMonth: values.expiryMonth,
      expiryYear: values.expiryYear,
      cvv: values.cvv,
      notes: values.notes,
      favorite: values.favorite,
    };
  }
  if (values.type === "identity") {
    return {
      type: "identity",
      title: values.title,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      address: values.address,
      city: values.city,
      country: values.country,
      notes: values.notes,
      favorite: values.favorite,
    };
  }
  return {
    type: "login",
    title: values.title,
    username: values.username,
    password: values.password,
    url: values.url,
    category: values.category,
    notes: values.notes,
    tags,
    favorite: values.favorite,
  };
}

export function VaultForm({
  initial,
  customCategories,
  onSubmit,
  onCancel,
}: {
  initial?: VaultRecord;
  customCategories: string[];
  onSubmit: (data: VaultPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const data = initial?.data;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: data?.type ?? "login",
      title: data?.title ?? "",
      username: data?.type === "login" ? data.username : "",
      password: data?.type === "login" ? data.password : "",
      url: data?.type === "login" ? data.url : "",
      category: data && "category" in data ? data.category : "Other",
      notes: data && "notes" in data ? data.notes : "",
      tags: data && "tags" in data ? data.tags.join(", ") : "",
      favorite: data?.favorite ?? false,
      content: data?.type === "note" ? data.content : "",
      cardholder: data?.type === "card" ? data.cardholder : "",
      number: data?.type === "card" ? data.number : "",
      expiryMonth: data?.type === "card" ? data.expiryMonth : "",
      expiryYear: data?.type === "card" ? data.expiryYear : "",
      cvv: data?.type === "card" ? data.cvv : "",
      fullName: data?.type === "identity" ? data.fullName : "",
      email: data?.type === "identity" ? data.email : "",
      phone: data?.type === "identity" ? data.phone : "",
      address: data?.type === "identity" ? data.address : "",
      city: data?.type === "identity" ? data.city : "",
      country: data?.type === "identity" ? data.country : "",
    },
  });
  const type = form.watch("type");
  const [showGen, setShowGen] = useState(false);
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...customCategories, "Custom"])];

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(toPayload(values));
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="w-full rounded-xl border border-[var(--color-line)] bg-transparent px-3 py-2.5 text-sm"
            {...form.register("type")}
          >
            <option value="login">Login</option>
            <option value="note">Secure note</option>
            <option value="card">Credit card</option>
            <option value="identity">Identity</option>
          </select>
        </div>
        <div>
          <Label htmlFor="title">Name</Label>
          <Input id="title" {...form.register("title")} />
        </div>
      </div>
      {type === "login" && (
        <>
          <div>
            <Label htmlFor="username">Username / email</Label>
            <Input id="username" {...form.register("username")} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            <Button type="button" variant="ghost" className="mt-1" onClick={() => setShowGen((v) => !v)}>
              {showGen ? "Hide generator" : "Generate password"}
            </Button>
            {showGen && (
              <div className="mt-2">
                <GeneratorPanel onUse={(password) => form.setValue("password", password)} />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="url">Website URL</Label>
            <Input id="url" placeholder="https://" {...form.register("url")} />
          </div>
        </>
      )}
      {type === "note" && (
        <div>
          <Label htmlFor="content">Secure content</Label>
          <Textarea id="content" {...form.register("content")} />
        </div>
      )}
      {type === "card" && (
        <>
          <Input placeholder="Cardholder" {...form.register("cardholder")} />
          <Input placeholder="Card number (stored encrypted)" {...form.register("number")} />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="MM" {...form.register("expiryMonth")} />
            <Input placeholder="YYYY" {...form.register("expiryYear")} />
            <Input placeholder="CVV" type="password" {...form.register("cvv")} />
          </div>
        </>
      )}
      {type === "identity" && (
        <>
          <Input placeholder="Full name" {...form.register("fullName")} />
          <Input placeholder="Email" {...form.register("email")} />
          <Input placeholder="Phone" {...form.register("phone")} />
          <Input placeholder="Address" {...form.register("address")} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="City" {...form.register("city")} />
            <Input placeholder="Country" {...form.register("country")} />
          </div>
        </>
      )}
      {type !== "card" && type !== "identity" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Category</Label>
            <Input id="category" list="cats" {...form.register("category")} />
            <datalist id="cats">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" placeholder="comma separated" {...form.register("tags")} />
          </div>
        </div>
      )}
      {type !== "note" && (
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...form.register("notes")} />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("favorite")} />
        Favorite
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
