import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Room, Equipment } from '@/types';
import { DEFAULT_ROOMS, EQUIPMENT } from '@/types';
import { loadSettings, saveSettings } from '@/services/settings';
import { UserRolesManager } from './UserRolesManager';
import { Settings2, Home, Package, Save, RotateCcw, Users, Sun, Moon } from 'lucide-react';
import type { User } from 'firebase/auth';

interface SettingsProps {
  isAdmin: boolean;
  currentUser: User | null;
}

export function Settings({ isAdmin, currentUser }: SettingsProps) {
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [equipment, setEquipment] = useState<Equipment[]>(EQUIPMENT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    const loadCurrentSettings = async () => {
      try {
        const settings = await loadSettings();
        setRooms(settings.rooms);
        setEquipment(settings.equipment);
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Помилка завантаження налаштувань');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      loadCurrentSettings();
    }
  }, [isAdmin]);

  const handleRoomTariffChange = (roomId: string, field: keyof Room['tariffs'], value: number) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, tariffs: { ...room.tariffs, [field]: value } } 
        : room
    ));
  };

  const handleEquipmentPriceChange = (eqId: string, price: number) => {
    setEquipment(prev => prev.map(eq => 
      eq.id === eqId ? { ...eq, pricePerHour: price } : eq
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        rooms,
        equipment,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Налаштування збережено!');
    } catch (error) {
      toast.error('Помилка збереження налаштувань');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setRooms(DEFAULT_ROOMS);
    setEquipment(EQUIPMENT);
    toast.info('Відновлено значення за замовчуванням. Натисніть "Зберегти" щоб застосувати.');
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Налаштування доступні тільки для адміністраторів</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Завантаження налаштувань...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="w-6 h-6" />
          Налаштування цін
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            За замовчуванням
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Збереження...' : 'Зберегти'}
          </Button>
        </div>
      </div>

      {/* Кімнати */}
      {rooms.map((room) => (
        <Card key={room.id} className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Home className="w-5 h-5" />
              {room.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Денний тариф (будні до 17:00) */}
            <div className="p-4 border border-zinc-700 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-zinc-300 font-medium">
                <Sun className="w-5 h-5" />
                <span>Будні до 17:00</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Звичайна ціна, грн/год</Label>
                  <Input
                    type="number"
                    min={0}
                    value={room.tariffs.weekdayDayPrice}
                    onChange={(e) => handleRoomTariffChange(room.id, 'weekdayDayPrice', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Резидент, грн/год</Label>
                  <Input
                    type="number"
                    min={0}
                    value={room.tariffs.weekdayDayResidentPrice}
                    onChange={(e) => handleRoomTariffChange(room.id, 'weekdayDayResidentPrice', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Вечірній тариф (будні після 17:00 + вихідні) */}
            <div className="p-4 border border-zinc-700 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-zinc-300 font-medium">
                <Moon className="w-5 h-5" />
                <span>Будні після 17:00 та вихідні</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Звичайна ціна, грн/год</Label>
                  <Input
                    type="number"
                    min={0}
                    value={room.tariffs.weekdayEveningPrice}
                    onChange={(e) => handleRoomTariffChange(room.id, 'weekdayEveningPrice', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Резидент, грн/год</Label>
                  <Input
                    type="number"
                    min={0}
                    value={room.tariffs.weekdayEveningResidentPrice}
                    onChange={(e) => handleRoomTariffChange(room.id, 'weekdayEveningResidentPrice', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Обладнання */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Обладнання
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (резидентство не діє)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {equipment.map((eq) => (
            <div key={eq.id} className="flex items-center justify-between p-3 border rounded-lg">
              <p className="font-medium">{eq.name}</p>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">грн/год:</Label>
                <Input
                  type="number"
                  min={0}
                  value={eq.pricePerHour}
                  onChange={(e) => handleEquipmentPriceChange(eq.id, parseInt(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Управління користувачами - тільки для власників */}
      <div className="pt-8 border-t border-zinc-800">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Users className="w-6 h-6" />
          Управління користувачами
        </h2>
        <UserRolesManager currentUser={currentUser} />
      </div>
    </div>
  );
}
