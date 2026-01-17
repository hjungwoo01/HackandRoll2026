import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Upload, Trophy, Menu, X, Compass, Award } from 'lucide-react';
import { useState } from 'react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../state/store';

interface AppShellProps {
  children: ReactNode;
}

const navItems = [
  { path: '/feed', label: 'Discovery', icon: Compass },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/collection', label: 'Your RareDex', icon: BookOpen },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { earnedBadges } = useStore();

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
        <div className="flex flex-col flex-grow bg-white/80 backdrop-blur-sm border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-6 border-b border-gray-200">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">RareDex</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  Live Demo
                </Badge>
                {earnedBadges.length > 0 && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {earnedBadges.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-gray-900">RareDex</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Live Demo
                  </Badge>
                  {earnedBadges.length > 0 && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      {earnedBadges.length}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-64 h-full bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <nav className="flex flex-col p-4 space-y-2 mt-16">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          isActive
                            ? "bg-primary-600 text-white shadow-md"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="min-h-screen pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm border-t border-gray-200 shadow-lg">
          <div className="grid grid-cols-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 text-xs font-medium transition-colors",
                    isActive
                      ? "text-primary-600"
                      : "text-gray-500"
                  )}
                >
                  <Icon className={cn("h-5 w-5 mb-1", isActive && "text-primary-600")} />
                  <span className={cn("text-[10px]", isActive && "font-semibold")}>
                    {item.label.split(' ')[0]}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
