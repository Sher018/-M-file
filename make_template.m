function outPath = make_template(filename)
    % MAKE_TEMPLATE Создание шаблона файла параметров сети с примером данных.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    % Подраздел диплома: 3.2 «Модуль импорта исходных данных»
    %
    % make_template                              — создаёт network_parameters_template.csv
    % make_template('my_net.csv')                — заданное имя (CSV)
    % make_template('my_net.xlsx')               — попытка XLSX, при неудаче — CSV
    %
    % Столбцы шаблона: Element, R1, X1, R0, X0, U_nom, R2, X2, Point.
    % R2/X2 — необязательные (Z2 = Z1, если пусто). Point — номер точки КЗ
    % для расчёта нескольких точек (см. run_points). Сопротивления в Омах,
    % U_nom в кВ.

    if nargin < 1 || isempty(filename)
        filename = 'network_parameters_template.csv';
    end

    rootDir = fileparts(mfilename('fullpath'));
    if ~sc_is_absolute(filename)
        filename = fullfile(rootDir, filename);
    end

    headers = {'Element', 'R1', 'X1', 'R0', 'X0', 'U_nom', 'R2', 'X2', 'Point'};
    data = {
        'Система',      0.5, 8.5, 0.8, 6.5, 10, '', '', 1
        'Линия Л1',     1.2, 3.4, 3.6, 9.8, 10, '', '', 1
        'Трансформатор', 0.9, 5.1, 0.9, 5.1, 10, '', '', 2
    };

    [~, ~, ext] = fileparts(filename);
    ext = lower(ext);

    wroteXlsx = false;
    if any(strcmp(ext, {'.xlsx', '.xls'}))
        wroteXlsx = try_write_xlsx(filename, headers, data);
        if ~wroteXlsx
            [p, b, ~] = fileparts(filename);
            filename = fullfile(p, [b '.csv']);
            warning('make_template: запись XLSX не удалась, создаю CSV: %s', filename);
        end
    end

    if ~wroteXlsx
        write_csv(filename, headers, data);
    end

    fprintf('Шаблон создан: %s\n', filename);
    fprintf('Заполните столбцы R1, X1, R0, X0 (Ом) и U_nom (кВ); сохраните и запустите расчёт.\n');
    outPath = filename;
end

function ok = try_write_xlsx(filename, headers, data)
    ok = false;
    try
        if exist('OCTAVE_VERSION', 'builtin') ~= 0
            pkg('load', 'io');
        end
        cellOut = [headers; data];
        xlswrite(filename, cellOut);
        ok = exist(filename, 'file') ~= 0;
    catch
        ok = false;
    end
end

function write_csv(filename, headers, data)
    fid = fopen(filename, 'w');
    if fid < 0
        error('make_template: не удалось создать файл %s.', filename);
    end
    fprintf(fid, '%s\n', strjoin(headers, ','));
    for r = 1:size(data, 1)
        parts = cell(1, size(data, 2));
        for c = 1:size(data, 2)
            v = data{r, c};
            if isnumeric(v) && isscalar(v)
                parts{c} = num2str(v);
            elseif ischar(v)
                parts{c} = v;
            else
                parts{c} = '';
            end
        end
        fprintf(fid, '%s\n', strjoin(parts, ','));
    end
    fclose(fid);
end
