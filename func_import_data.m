function [Z1, Z2, Z0, E, U_nom, scInfo] = func_import_data(filename)
    % FUNC_IMPORT_DATA Импорт параметров электрической сети из таблицы (XLSX/CSV).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    % Подраздел диплома: 3.2 «Модуль импорта исходных данных func_import_data.m»
    %
    % Все строки таблицы суммируются в одну эквивалентную точку КЗ
    % (обратная совместимость). Для нескольких точек см. func_import_points.m.
    %
    % Выход scInfo: Z_base, inputFile, z2_from_excel, nElements.

    if nargin < 1
        filename = 'network_parameters.xlsx';
    end

    scInfo = struct('Z_base', [], 'inputFile', '', 'z2_from_excel', false, 'nElements', 0);
    [~, fn, ext] = fileparts(filename);
    scInfo.inputFile = [fn ext];

    [headers, rows] = sc_read_table(filename);

    [R1_col, X1_col, R0_col, X0_col, U_nom_col, R2_col, X2_col] = ...
        extract_required(headers, rows, filename);

    n = numel(R1_col);
    U_nom = U_nom_col(1);
    if ~(isfinite(U_nom) && U_nom > 0)
        error('func_import_data: U_nom должно быть конечным положительным числом (кВ). Проверьте первую строку данных.');
    end

    Z_base = (U_nom^2) / 100;
    scInfo.Z_base = Z_base;
    scInfo.nElements = n;

    Z1 = sum((R1_col + 1j * X1_col) / Z_base);
    Z0 = sum((R0_col + 1j * X0_col) / Z_base);

    if ~isempty(R2_col) && ~isempty(X2_col)
        if numel(R2_col) ~= n || numel(X2_col) ~= n
            error('func_import_data: столбцы R2 и X2 должны иметь ту же длину, что и R1/X1.');
        end
        Z2 = sum((R2_col + 1j * X2_col) / Z_base);
        scInfo.z2_from_excel = true;
    else
        Z2 = Z1;
    end

    E = 1.05;
    fprintf('  Загружено элементов сети: %d (Uном = %.1f кВ)\n', n, U_nom);
end

function [R1, X1, R0, X0, Un, R2, X2] = extract_required(headers, rows, filename)
    % Собирает все отсутствующие обязательные столбцы и сообщает разом.
    required = {'R1', 'X1', 'R0', 'X0', 'U_nom'};
    present = strtrim_cell(headers);
    missing = {};
    for k = 1:numel(required)
        if ~any(strcmpi(present, required{k}))
            missing{end + 1} = required{k}; %#ok<AGROW>
        end
    end
    if ~isempty(missing)
        error(['func_import_data: в файле «%s» отсутствуют обязательные столбцы: %s.\n', ...
               'Ожидаемые столбцы: Element (текст), R1, X1, R0, X0, U_nom; необязательно R2, X2, Point.\n', ...
               'Подсказка: создайте корректный шаблон командой  make_template  и заполните его.'], ...
               filename, strjoin(missing, ', '));
    end

    R1 = sc_table_numeric(headers, rows, 'R1', false);
    X1 = sc_table_numeric(headers, rows, 'X1', false);
    R0 = sc_table_numeric(headers, rows, 'R0', false);
    X0 = sc_table_numeric(headers, rows, 'X0', false);
    Un = sc_table_numeric(headers, rows, 'U_nom', false);
    R2 = sc_table_numeric(headers, rows, 'R2', true);
    X2 = sc_table_numeric(headers, rows, 'X2', true);

    n = numel(R1);
    if numel(X1) ~= n || numel(R0) ~= n || numel(X0) ~= n
        error('func_import_data: число значений в столбцах R1, X1, R0, X0 не совпадает.');
    end
end

function out = strtrim_cell(c)
    out = cell(size(c));
    for k = 1:numel(c)
        if ischar(c{k})
            out{k} = strtrim(c{k});
        else
            out{k} = '';
        end
    end
end
