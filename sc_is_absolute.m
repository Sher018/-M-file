function tf = sc_is_absolute(p)
    % SC_IS_ABSOLUTE Проверка, является ли путь абсолютным (Windows/Unix).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0

    tf = false;
    if isempty(p) || ~ischar(p)
        return;
    end
    if ispc
        tf = (numel(p) >= 2 && p(2) == ':') || p(1) == '\' || p(1) == '/';
    else
        tf = p(1) == '/';
    end
end
