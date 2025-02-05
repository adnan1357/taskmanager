import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <Card className="w-[400px] p-6">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name">Name</label>
          <Input id="name" type="text" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="password">Password</label>
          <Input id="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">Register</Button>
      </form>
    </Card>
  );
}