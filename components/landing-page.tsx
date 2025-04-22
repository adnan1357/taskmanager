import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Boxes, Users2, Star, Zap, Shield, BarChart } from "lucide-react";

const containerClass = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Navigation */}
      <header className="fixed w-full z-50 h-16 flex items-center bg-white/80 backdrop-blur-sm border-b border-purple-100">
        <div className={`${containerClass} w-full flex items-center`}>
          <Link className="flex items-center justify-center" href="/">
            <Boxes className="h-6 w-6 text-purple-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">TaskMaster</span>
          </Link>
          <nav className="ml-8 hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-purple-600">Features</Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-purple-600">Pricing</Link>
            <Link href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-purple-600">Testimonials</Link>
          </nav>
          <div className="ml-auto flex gap-4">
            <Button variant="ghost" className="text-gray-700 hover:text-purple-600" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full pt-32 pb-20 md:pt-40 md:pb-28">
          <div className={containerClass}>
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400">
                  Project Management <br />Made Simple
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  The most intuitive way to manage your projects. Streamline workflows, 
                  collaborate seamlessly, and achieve more with TaskMaster.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 min-[400px]:items-center justify-center">
                <Button 
                  size="lg" 
                  className="bg-purple-600 hover:bg-purple-700 text-lg"
                  asChild
                >
                  <Link href="/login" className="flex items-center">
                    Get Started for Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-purple-200 hover:bg-purple-50 text-lg"
                >
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="w-full py-12 bg-gradient-to-b from-purple-50 to-white">
          <div className={containerClass}>
            <div className="relative max-w-6xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-100/50 to-blue-100/50 rounded-2xl transform -rotate-1"></div>
              <div className="relative rounded-xl overflow-hidden border border-purple-100 shadow-2xl">
                <Image
                  src="/images/landing/dashboard.png"
                  alt="TaskMaster Dashboard"
                  width={1920}
                  height={1080}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 bg-white">
          <div className={containerClass}>
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Everything you need to manage projects <br />
                <span className="text-purple-600">all in one place</span>
              </h2>
              <p className="mt-4 text-gray-500 md:text-lg">
                Powerful features to help your team succeed
              </p>
            </div>
            <div className="max-w-6xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                icon={<CheckCircle2 className="h-6 w-6 text-purple-600" />}
                title="Task Management"
                description="Create, organize, and track tasks with ease. Set priorities and deadlines to stay on top of your work."
              />
              <FeatureCard 
                icon={<Users2 className="h-6 w-6 text-purple-600" />}
                title="Team Collaboration"
                description="Work together seamlessly with your team. Share tasks, communicate, and track progress in real-time."
              />
              <FeatureCard 
                icon={<BarChart className="h-6 w-6 text-purple-600" />}
                title="Project Analytics"
                description="Get detailed insights into your project's progress with beautiful charts and reports."
              />
              <FeatureCard 
                icon={<Zap className="h-6 w-6 text-purple-600" />}
                title="Automation"
                description="Automate repetitive tasks and workflows to save time and reduce errors."
              />
              <FeatureCard 
                icon={<Shield className="h-6 w-6 text-purple-600" />}
                title="Security"
                description="Enterprise-grade security to keep your data safe and compliant."
              />
              <FeatureCard 
                icon={<Star className="h-6 w-6 text-purple-600" />}
                title="Customization"
                description="Customize your workspace to match your team's unique workflow and needs."
              />
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="w-full py-16 bg-purple-50">
          <div className={containerClass}>
            <div className="max-w-5xl mx-auto flex flex-col items-center space-y-8">
              <div className="flex items-center space-x-8 text-gray-400">
                <span className="text-xl font-semibold">Trusted by leading companies worldwide</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20">
          <div className={containerClass}>
            <div className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl bg-purple-600">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500"></div>
              <div className="relative px-8 py-16 md:py-20 text-center">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-white mb-4">
                  Ready to transform your project management?
                </h2>
                <p className="mx-auto max-w-[600px] text-purple-100 md:text-xl mb-8">
                  Join thousands of teams already using TaskMaster to improve their productivity.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    className="bg-white text-purple-600 hover:bg-purple-50"
                    asChild
                  >
                    <Link href="/login">Get Started for Free</Link>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-purple-500"
                    asChild
                  >
                    <Link href="/contact">Contact Sales</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 bg-gray-50">
        <div className={containerClass}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Product</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><Link href="#">Features</Link></li>
                  <li><Link href="#">Pricing</Link></li>
                  <li><Link href="#">Security</Link></li>
                  <li><Link href="#">Roadmap</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Company</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><Link href="#">About</Link></li>
                  <li><Link href="#">Blog</Link></li>
                  <li><Link href="#">Careers</Link></li>
                  <li><Link href="#">Contact</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Resources</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><Link href="#">Documentation</Link></li>
                  <li><Link href="#">Help Center</Link></li>
                  <li><Link href="#">API</Link></li>
                  <li><Link href="#">Status</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><Link href="#">Privacy</Link></li>
                  <li><Link href="#">Terms</Link></li>
                  <li><Link href="#">Security</Link></li>
                  <li><Link href="#">Cookies</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                © 2024 TaskMaster. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="flex flex-col items-start p-6 bg-white rounded-xl border border-purple-100 hover:border-purple-200 transition-colors">
      <div className="p-3 bg-purple-50 rounded-lg mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
} 