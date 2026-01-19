'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING, getMotionSafeTransition, getMotionSafeInitial } from '@/lib/motion/springs';

type FooterProps = {
  className?: string;
};

const footerLinks = {
  legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
  ],
  support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Contact Us', href: '/contact' },
  ],
  social: [
    { label: 'Twitter', href: 'https://twitter.com/aptlylearning', external: true },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/aptlylearning', external: true },
    { label: 'Facebook', href: 'https://facebook.com/aptlylearning', external: true },
  ],
};

export function Footer({ className }: FooterProps) {
  const prefersReducedMotion = useReducedMotion();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'bg-navy text-white/90 border-t border-navy-light',
        className
      )}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Logo and tagline */}
          <motion.div
            className="lg:col-span-1"
            initial={getMotionSafeInitial({ opacity: 0, y: 20 }, prefersReducedMotion)}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={getMotionSafeTransition(SPRING.gentle, prefersReducedMotion)}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 group mb-4"
              aria-label="Aptly Learning Home"
            >
              <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                <span className="text-xl font-bold text-white">A</span>
              </div>
              <span className="text-xl font-bold text-white">Aptly Learning</span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              Master social media marketing with your personal AI coach. Learn smarter, not harder.
            </p>
          </motion.div>

          {/* Legal links */}
          <motion.div
            initial={getMotionSafeInitial({ opacity: 0, y: 20 }, prefersReducedMotion)}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={getMotionSafeTransition(
              { ...SPRING.gentle, delay: 0.1 },
              prefersReducedMotion
            )}
          >
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-teal transition-colors text-sm inline-flex items-center gap-1 group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Support links */}
          <motion.div
            initial={getMotionSafeInitial({ opacity: 0, y: 20 }, prefersReducedMotion)}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={getMotionSafeTransition(
              { ...SPRING.gentle, delay: 0.2 },
              prefersReducedMotion
            )}
          >
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">
              Support
            </h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-teal transition-colors text-sm inline-flex items-center gap-1 group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="mailto:support@aptlylearning.com"
                  className="text-white/70 hover:text-teal transition-colors text-sm inline-flex items-center gap-2 group"
                >
                  <Mail size={16} className="text-teal" />
                  <span className="group-hover:translate-x-0.5 transition-transform">
                    support@aptlylearning.com
                  </span>
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Social media */}
          <motion.div
            initial={getMotionSafeInitial({ opacity: 0, y: 20 }, prefersReducedMotion)}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={getMotionSafeTransition(
              { ...SPRING.gentle, delay: 0.3 },
              prefersReducedMotion
            )}
          >
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">
              Connect
            </h3>
            <ul className="space-y-3">
              {footerLinks.social.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-teal transition-colors text-sm inline-flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">
                      {link.label}
                    </span>
                    {link.external && (
                      <ExternalLink size={14} className="text-white/50 group-hover:text-teal" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom bar - Copyright and additional info */}
        <motion.div
          className="pt-8 border-t border-white/10"
          initial={getMotionSafeInitial({ opacity: 0 }, prefersReducedMotion)}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={getMotionSafeTransition(
            { ...SPRING.gentle, delay: 0.4 },
            prefersReducedMotion
          )}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-sm">
              © {currentYear} Aptly Learning. All rights reserved.
            </p>
            <p className="text-white/60 text-sm text-center md:text-right">
              Made with{' '}
              <span className="text-teal" aria-label="love">
                ♥
              </span>{' '}
              for learners everywhere
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
