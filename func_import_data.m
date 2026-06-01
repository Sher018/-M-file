function [Z1, Z2, Z0, E, U_nom, scInfo] = func_import_data(filename)
    % FUNC_IMPORT_DATA Импорт параметров электрической сети из таблицы (XLSX/CSV).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.4.0
    % Подраздел диплома: 3.2 «Модуль импорта исходных данных func_import_data.m»
    %
    % Ветви объединяются по столбцу Parallel (параллельно внутри группы, затем
    % последовательно); без столбца — чистое последовательное суммирование
    % (обратная совместимость). Для нескольких точек см. func_import_points.m.
    %
    % Необязательные параметры (берётся первое значение столбца):
    %   c   — коэффициент напряжения (ГОСТ Р 52735 / IEC 60909), E = c (по умолчанию 1.1);
    %   Rf  — переходное сопротивление в точке КЗ, Ом (по умолчанию 0).
    %
    % Выход scInfo: Z_base, inputFile, z2_from_excel, nElements, c, Rf_ohm, Rf_pu.

    if nargin < 1
        filename = 'network_parameters.xlsx';
    end

    scInfo = struct('Z_base', [], 'inputFile', '', 'z2_from_excel', false, ...
        'nElements', 0, 'c', 1.1, 'Rf_ohm', 0, 'Rf_pu', 0);
    [~, fn, ext] = fileparts(filename);
    scInfo.inputFile = [fn ext];

    [headers, rows] = sc_read_table(filename);
    check_required(headers, filename);

    R1 = sc_table_numeric(headers, rows, 'R1', false);
    X1 = sc_table_numeric(headers, rows, 'X1', false);
    R0 = sc_table_numeric(headers, rows, 'R0', false);
    X0 = sc_table_numeric(headers, rows, 'X0', false);
    Un = sc_table_numeric(headers, rows, 'U_nom', false);
    R2 = sc_table_numeric(headers, rows, 'R2', true);
    X2 = sc_table_numeric(headers, rows, 'X2', true);
    cCol = sc_table_numeric(headers, rows, 'c', true);
    RfCol = sc_table_numeric(headers, rows, 'Rf', true);
    parLab = sc_table_text(headers, rows, 'Parallel');

    n = numel(R1);
    if numel(X1) ~= n || numel(R0) ~= n || numel(X0) ~= n
        error('func_import_data: число значений в столбцах R1, X1, R0, X0 не совпадает.');
    end

    U_nom = Un(1);
    if ~(isfinite(U_nom) && U_nom > 0)
        error('func_import_data: U_nom должно быть конечным положительным числом (кВ).');
    end
    Z_base = (U_nom^2) / 100;
    scInfo.Z_base = Z_base;
    scInfo.nElements = n;

    if ~isempty(cCol)
        scInfo.c = cCol(1);
    end
    if ~isempty(RfCol)
        scInfo.Rf_ohm = RfCol(1);
    end
    scInfo.Rf_pu = scInfo.Rf_ohm / Z_base;

    Z1 = sc_series_parallel((R1 + 1j * X1), parLab) / Z_base;
    Z0 = sc_series_parallel((R0 + 1j * X0), parLab) / Z_base;

    if ~isempty(R2) && ~isempty(X2)
        if numel(R2) ~= n || numel(X2) ~= n
            error('func_import_data: столбцы R2 и X2 должны иметь ту же длину, что и R1/X1.');
        end
        Z2 = sc_series_parallel((R2 + 1j * X2), parLab) / Z_base;
        scInfo.z2_from_excel = true;
    else
        Z2 = Z1;
    end

    E = scInfo.c;
    fprintf('  Загружено элементов сети: %d (Uном = %.1f кВ, c = %.2f', n, U_nom, scInfo.c);
    if scInfo.Rf_ohm ~= 0
        fprintf(', Rf = %.3f Ом', scInfo.Rf_ohm);
    end
    fprintf(')\n');
end

function check_required(headers, filename)
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
               'Ожидаемые столбцы: Element (текст), R1, X1, R0, X0, U_nom; ', ...
               'необязательно R2, X2, Point, Parallel, c, Rf.\n', ...
               'Подсказка: создайте корректный шаблон командой  make_template  и заполните его.'], ...
               filename, strjoin(missing, ', '));
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
