'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

import {
  House,
  FileText,
  ChartBar,
  ListChecks,
  Gear,
  User,
  List,
  CaretRight,
  Lightning,
  Users,
  Browsers,
  Database,
  Plus,
  PenNib,
  SquaresFour,
  ShieldCheck,
  Globe,
  Sliders,
  CaretDown,
  Sparkle
} from '@phosphor-icons/react';
import ArticlesView from '@/components/ArticlesView';
import AnalysisView from '@/components/dashboard/AnalysisView';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import HomeSectionManager from '@/components/dashboard/HomeSectionManager';
import PipelineManager from '@/components/dashboard/PipelineManager';
import UserManager from '@/components/dashboard/UserManager';
import PagesManager from '@/components/dashboard/PagesManager';
import DbManager from '@/components/dashboard/DbManager';
import Link from 'next/link';

interface NavGroupItem {
  id: string;
  label: string;
  subLabel?: string;
  icon: React.ElementType;
  component?: React.ReactNode;
  href?: string;
  adminOnly?: boolean;
  badge?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavGroupItem[];
}

export default function Dashboard() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'bn';
  const isBn = locale === 'bn';

  const initialTab = searchParams?.get('tab') || 'overview';
  const [currentActiveTab, setCurrentActiveTab] = useState(initialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Keep state synced if URL parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl && tabFromUrl !== currentActiveTab) {
      setCurrentActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setCurrentActiveTab(tabId);
    setIsMobileMenuOpen(false);
    const newUrl = `/${locale}/dashboard?tab=${tabId}`;
    router.push(newUrl, { scroll: false });
  };

  const navGroups: NavGroup[] = [
    {
      groupTitle: isBn ? 'মূল ড্যাশবোর্ড' : 'Main Menu',
      items: [
        {
          id: 'overview',
          label: isBn ? 'ওভারভিউ' : 'Overview',
          subLabel: isBn ? 'সামগ্রিক পরিসংখ্যান ও সূচক' : 'Overall stats & insights',
          icon: House,
          component: <DashboardOverview />,
        },
        {
          id: 'articles',
          label: isBn ? 'নিবন্ধসমূহ' : 'My Articles',
          subLabel: isBn ? 'প্রকাশিত ও ড্রাফট নিবন্ধ' : 'Manage your articles',
          icon: FileText,
          component: <ArticlesView />,
        },
        {
          id: 'analysis',
          label: isBn ? 'অ্যানালাইসিস' : 'Analytics',
          subLabel: isBn ? 'ট্রেন্ড ও পাঠকদের পরিসংখ্যান' : 'Engagement & reading stats',
          icon: ChartBar,
          component: <AnalysisView />,
        },
      ],
    },
    {
      groupTitle: isBn ? 'কন্টেন্ট ও সাইট ব্যবস্থাপনা' : 'Content & Structure',
      items: [
        {
          id: 'pages',
          label: isBn ? 'পেইজসমূহ' : 'Custom Pages',
          subLabel: isBn ? 'কাস্টম পেইজ ও রুট ডিজাইন' : 'Routes & landing pages',
          icon: Browsers,
          component: <PagesManager />,
          adminOnly: true,
        },
        {
          id: 'home-manager',
          label: isBn ? 'হোম ম্যানেজার' : 'Home Sections',
          subLabel: isBn ? 'হোমপেইজের সেকশন ও লেআউট' : 'Homepage layout & blocks',
          icon: ListChecks,
          component: <HomeSectionManager />,
          adminOnly: true,
        },
        {
          id: 'menu-manager',
          label: isBn ? 'মেনু ম্যানেজার' : 'Navigation Menu',
          subLabel: isBn ? 'হেডার ও মোবাইল নেভিগেশন' : 'Navbar & header links',
          icon: List,
          href: `/${locale}/admin/menu`,
          adminOnly: true,
        },
      ],
    },
    {
      groupTitle: isBn ? 'সিস্টেম ও অ্যাডমিনিস্ট্রেশন' : 'System Administration',
      items: [
        {
          id: 'database',
          label: isBn ? 'ডাটাবেস' : 'Database Manager',
          subLabel: isBn ? 'টেবিল, সারি ও এসকিউএল কনসোল' : 'Inspect & query PostgreSQL',
          icon: Database,
          component: <DbManager />,
          adminOnly: true,
        },
        {
          id: 'pipeline',
          label: isBn ? 'এআই পাইপলাইন' : 'AI Pipeline',
          subLabel: isBn ? 'অটো ইনজেশন ও প্রসেসিং' : 'Automated feeds & workflows',
          icon: Lightning,
          component: <PipelineManager />,
          adminOnly: true,
          badge: isBn ? 'অটো' : 'Auto',
        },
        {
          id: 'users',
          label: isBn ? 'ব্যবহারকারী' : 'User Accounts',
          subLabel: isBn ? 'রোল, পারমিশন ও ফ্রিলিস্ট' : 'Roles, access & moderation',
          icon: Users,
          component: <UserManager />,
          adminOnly: true,
        },
        {
          id: 'settings',
          label: isBn ? 'সিস্টেম সেটিংস' : 'System Settings',
          subLabel: isBn ? 'এআই, ফেসবুক ও পোর্টাল কনফিগ' : 'API keys, templates & config',
          icon: Gear,
          href: `/${locale}/admin/settings`,
          adminOnly: true,
        },
      ],
    },
  ];

  const isAdmin = session?.user?.role === 'admin';

  // Filter groups and items
  const filteredNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((group) => group.items.length > 0);

  const allItems = filteredNavGroups.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => i.id === currentActiveTab) || allItems[0];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      <Header />

      <div className="flex-1 flex flex-col">
        {/* Top Control Bar with Glassmorphic Style */}
        <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs backdrop-blur-md bg-white/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Breadcrumb & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-sm">
                <SquaresFour size={22} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Link href={`/${locale}`} className="hover:text-slate-900 transition-colors flex items-center gap-1">
                    <Globe size={13} />
                    {isBn ? 'হোম' : 'Home'}
                  </Link>
                  <span>/</span>
                  <span className="text-slate-700 font-bold">
                    {isBn ? 'কন্ট্রোল প্যানেল' : 'Dashboard'}
                  </span>
                  <span>/</span>
                  <span className="text-slate-900 font-extrabold">{activeItem?.label}</span>
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-950 mt-0.5">
                  {activeItem?.label}
                </h1>
              </div>
            </div>

            {/* Quick Actions & User Pill */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <Link
                href={`/${locale}/write`}
                className="inline-flex items-center gap-2 bg-slate-950 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all shadow-sm hover:shadow active:scale-[0.98]"
              >
                <Plus size={16} weight="bold" />
                <span>{isBn ? 'নতুন নিবন্ধ লিখুন' : 'Write Article'}</span>
              </Link>

              {session?.user && (
                <div className="flex items-center gap-2.5 bg-slate-100/80 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60 transition-colors">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 shadow-xs shrink-0">
                    {session.user.image ? (
                      <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-slate-500" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-extrabold text-slate-950 leading-tight">
                      {session.user.name || (isBn ? 'প্রশাসক' : 'User')}
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-700 capitalize flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      {session.user.role === 'admin'
                        ? (isBn ? 'প্রশাসক (Admin)' : 'Administrator')
                        : (isBn ? 'লেখক (Member)' : 'Contributor')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Trigger / Dropdown */}
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200/70 w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <activeItem.icon size={16} className="text-slate-900" />
              <span>{isBn ? 'ট্যাব পরিবর্তন:' : 'Current tab:'} {activeItem?.label}</span>
            </div>
            <CaretDown size={14} className={`text-slate-500 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Mobile Navigation Drawer Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-4 shadow-lg animate-in slide-in-from-top-2">
            {filteredNavGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                  {group.groupTitle}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {group.items.map((item) => {
                    const isActive = currentActiveTab === item.id;
                    const Icon = item.icon;

                    if (item.href) {
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          <Icon size={16} className="text-slate-400" />
                          <span>{item.label}</span>
                          <CaretRight size={12} className="ml-auto text-slate-400" />
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                          isActive
                            ? 'bg-slate-950 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto font-bold ${
                            isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Body */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 flex flex-col lg:flex-row gap-8 items-start">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden lg:flex flex-col w-72 shrink-0 space-y-6 sticky top-24">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-6">
              {filteredNavGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <div className="px-3 pb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                      {group.groupTitle}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = currentActiveTab === item.id;
                      const Icon = item.icon;

                      if (item.href) {
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className="group flex items-center justify-between px-3 py-2.5 rounded-2xl text-slate-600 hover:text-slate-950 hover:bg-slate-100/90 transition-all border border-transparent"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-slate-200/80 flex items-center justify-center text-slate-500 group-hover:text-slate-900 transition-colors shrink-0">
                                <Icon size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold tracking-tight truncate text-slate-700 group-hover:text-slate-950">
                                  {item.label}
                                </p>
                                {item.subLabel && (
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {item.subLabel}
                                  </p>
                                )}
                              </div>
                            </div>
                            <CaretRight size={13} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                          </Link>
                        );
                      }

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTabChange(item.id)}
                          className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition-all border ${
                            isActive
                              ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/90 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                              isActive
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-100 group-hover:bg-slate-200/80 text-slate-500 group-hover:text-slate-900'
                            }`}>
                              <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-bold tracking-tight truncate ${isActive ? 'text-white' : 'text-slate-700 group-hover:text-slate-950'}`}>
                                {item.label}
                              </p>
                              {item.subLabel && (
                                <p className={`text-[10px] truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                                  {item.subLabel}
                                </p>
                              )}
                            </div>
                          </div>

                          {item.badge ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                              isActive ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {item.badge}
                            </span>
                          ) : (
                            <CaretRight size={13} className={`shrink-0 ml-1 transition-all ${
                              isActive ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5'
                            }`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick helper card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-5 text-white border border-slate-800 shadow-sm relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                  <Sparkle size={12} weight="fill" className="text-amber-400" />
                  {isBn ? 'সহায়তা ও টিপস' : 'Productivity Tip'}
                </span>
                <h4 className="text-xs font-bold leading-tight">
                  {isBn ? 'সরাসরি শর্টকাট' : 'Quick Actions'}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isBn
                    ? 'নতুন পৃষ্ঠা তৈরি করতে অথবা সাইটের হোম লেআউট পরিবর্তন করতে বাম পাশের মেনু ব্যবহার করুন।'
                    : 'Customize portal structure and create rich pages dynamically from the dashboard.'}
                </p>
              </div>
            </div>
          </aside>

          {/* Main Content Workspace Container */}
          <section className="flex-1 w-full min-w-0 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs">
            {activeItem?.component}
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}
