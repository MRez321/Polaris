import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogIn, LogOut, Settings2, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** First letter of up to two words, for the avatar fallback. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('‌');
}

interface UserAvatarProps {
  name: string;
  image?: string;
  className?: string;
}

/**
 * Circular profile avatar with a gold gradient ring. Shows the user's
 * actual profile picture (better-auth `user.image`, populated by Google
 * sign-in) with initials as fallback when missing or broken. Shared
 * across all three surfaces: public header, workshop header, control panel.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ name, image, className }) => {
  const [failed, setFailed] = React.useState(false);
  const showImage = Boolean(image) && !failed;

  return (
    <span
      className={cn(
        'relative w-9 h-9 rounded-full p-[2.5px] bg-gradient-to-br from-[#A67C38] via-[#CEAE80] to-[#A67C38] shadow-md shrink-0',
        className
      )}
    >
      {showImage && (
        <img
          src={image}
          alt={''}
          className="w-full h-full rounded-full object-cover bg-stone-200 dark:bg-stone-700 border-2 border-[#F8F7F4] dark:border-[#16161a]"
          onError={() => setFailed(true)}
        />
      )}
      {!showImage && (
        <span className="w-full h-full rounded-full bg-[#CEAE80] text-black text-xs font-black flex items-center justify-center">
          {initials(name)}
        </span>
      )}
    </span>
  );
};

interface UserMenuProps {
  /** Extra classes for the trigger chip (each surface sizes it differently). */
  className?: string;
  /** Where the signed-out user lands; also the post-signout target. */
  loginTo?: string;
  /** Show the user name next to the avatar on sm+ screens. */
  showName?: boolean;
}

/**
 * Role-aware account menu, one component for all three surfaces
 * (public website, workshop dashboard, control panel). Avatar shows the
 * profile picture; the dropdown links to the account dashboard, the
 * control panel (admin+author), and the workshop (admin).
 */
export const UserMenu: React.FC<UserMenuProps> = ({
  className,
  loginTo = '/login',
  showName = true,
}) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => navigate(loginTo)}
        className={cn(
          'flex items-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-xs sm:text-sm font-black shadow-md shadow-[#CEAE80]/25 transition-all active:scale-95',
          className
        )}
      >
        <LogIn className="w-4 h-4" />
        ورود
      </button>
    );
  }

  const isAuthor = user.role === 'author';
  const canManageSite = isAdmin || isAuthor;

  const handleSignOut = async () => {
    await signOut();
    navigate(loginTo);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-2 h-9 sm:h-10 ps-1 pe-2 sm:pe-3 rounded-xl border border-stone-200/80 dark:border-white/10 hover:border-[#CEAE80]/50 bg-white dark:bg-white/5 transition-all active:scale-95',
          className
        )}
        aria-label="منوی حساب کاربری"
      >
        <UserAvatar name={user.name} image={user.image} className="w-8 h-8" />
        {showName && (
          <span className="hidden sm:block max-w-28 truncate text-xs font-bold text-stone-700 dark:text-stone-200">
            {user.name}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>
            <span className="block truncate">{user.name}</span>
            <span className="block truncate text-[11px] font-normal text-muted-foreground" dir="ltr">
              {user.email}
            </span>
          </DropdownMenuGroupLabel>
          <DropdownMenuItem render={<Link to="/dashboard" />}>
            <UserRound />
            حساب کاربری من
          </DropdownMenuItem>
          {canManageSite && (
            <DropdownMenuItem render={<Link to="/controlpanel" />}>
              <Settings2 />
              مدیریت وب‌سایت
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem render={<Link to="/workshop" />}>
              <LayoutDashboard />
              پنل کارگاه
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut />
          خروج از حساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
