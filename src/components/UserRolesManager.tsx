import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  getAllUserRoles, 
  setUserRole, 
  removeUserRole, 
  subscribeToUserRoles,
  type UserRole,
  type UserRoleData 
} from '@/services/userRoles';
import { Users, Crown, Shield, Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from 'firebase/auth';

interface UserRolesManagerProps {
  currentUser: User | null;
}

export function UserRolesManager({ currentUser }: UserRolesManagerProps) {
  const [users, setUsers] = useState<UserRoleData[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRoleData | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('admin');

  // Підписка на зміни ролей
  useEffect(() => {
    const unsubscribe = subscribeToUserRoles((rolesMap) => {
      const rolesArray: UserRoleData[] = [];
      rolesMap.forEach((role, email) => {
        rolesArray.push({
          email,
          role,
          createdAt: new Date().toISOString(),
        });
      });
      setUsers(rolesArray.sort((a, b) => a.email.localeCompare(b.email)));
    });

    // Початкове завантаження
    loadUsers();

    return () => unsubscribe();
  }, []);

  const loadUsers = async () => {
    const roles = await getAllUserRoles();
    setUsers(roles.sort((a, b) => a.email.localeCompare(b.email)));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error('Введіть email користувача');
      return;
    }

    // Перевірка формату email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Некоректний формат email');
      return;
    }

    setIsLoading(true);
    try {
      await setUserRole(newEmail, newRole, currentUser?.uid);
      toast.success(`Користувача ${newEmail} додано з роллю ${newRole === 'owner' ? 'Власник' : 'Адміністратор'}`);
      setNewEmail('');
      setNewRole('admin');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Помилка додавання користувача');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (user: UserRoleData) => {
    setEditingUser(user.email);
    setEditRole(user.role);
  };

  const handleSaveEdit = async (email: string) => {
    const user = users.find(u => u.email === email);
    if (!user) return;

    // Не дозволяємо змінити роль останнього owner на admin
    if (user.role === 'owner' && editRole === 'admin') {
      const ownersCount = users.filter(u => u.role === 'owner').length;
      if (ownersCount <= 1) {
        toast.error('Не можна змінити роль останнього власника');
        return;
      }
    }

    try {
      await setUserRole(email, editRole, currentUser?.uid);
      toast.success(`Роль користувача ${email} оновлено`);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Помилка оновлення ролі');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditRole('admin');
  };

  const handleDeleteClick = (user: UserRoleData) => {
    // Не дозволяємо видалити самого себе
    if (user.email.toLowerCase() === currentUser?.email?.toLowerCase()) {
      toast.error('Не можна видалити власний акаунт');
      return;
    }
    
    // Не дозволяємо видалити останнього owner
    const ownersCount = users.filter(u => u.role === 'owner').length;
    if (user.role === 'owner' && ownersCount <= 1) {
      toast.error('Не можна видалити останнього власника');
      return;
    }

    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await removeUserRole(userToDelete.email);
      toast.success(`Користувача ${userToDelete.email} видалено`);
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Помилка видалення користувача');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Пояснення */}
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Як додати користувача:</strong><br/>
            1. <strong>Автоматично:</strong> Створіть користувача в Firebase Authentication → при першому вході в додаток він автоматично отримає роль «Адміністратор»<br/>
            2. <strong>Вручну:</strong> Введіть email нижче, щоб призначити роль заздалегідь (до першого входу користувача)
          </p>
        </CardContent>
      </Card>

      {/* Додавання нового користувача */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Призначити роль користувачеві
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email користувача</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="w-48 space-y-2">
              <Label>Роль</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      Адміністратор
                    </div>
                  </SelectItem>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      Власник
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading} className="gap-2">
              <Plus className="w-4 h-4" />
              Додати
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Список користувачів */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Користувачі системи
            </div>
            <div className="text-sm text-muted-foreground font-normal">
              {users.filter(u => u.role === 'owner').length} власників, {users.filter(u => u.role === 'admin').length} адміністраторів
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Немає доданих користувачів
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {editingUser === user.email ? (
                        <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-green-500" />
                                Адміністратор
                              </div>
                            </SelectItem>
                            <SelectItem value="owner">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-yellow-500" />
                                Власник
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : user.role === 'owner' ? (
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          <span>Власник</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          <span>Адміністратор</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {editingUser === user.email ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveEdit(user.email)}
                              className="text-green-500 hover:text-green-600"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(user)}
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Діалог підтвердження видалення */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити користувача?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити користувача {userToDelete?.email}?
              Він втратить доступ до адмін-панелі.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Скасувати
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
